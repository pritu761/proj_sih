import { describe, it, expect, beforeEach } from "vitest";
import {
  buildAuditChain,
  hashEntry,
  resetAuditAttestation,
  GENESIS_HASH,
} from "@/lib/services/audit-chain";
import type { AuditEntry } from "@/lib/services/audit";
import { generateSeedData } from "@/lib/mock-data-generator";

function entry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    user: "rb.officer@aicte.gov.in",
    action: "STATUS_CHANGED",
    entity: "CASE",
    entity_id: "AICTE/RB/2026/00001",
    before: { status: "PENDING" },
    after: { status: "UNDER_PROCESS" },
    ip: "10.24.8.1",
    timestamp: new Date("2026-10-20T10:00:00Z"),
    ...overrides,
  };
}

describe("Tamper-evident audit chain", () => {
  beforeEach(() => {
    resetAuditAttestation();
  });

  it("seals entries in chronological order and exposes the newest first", () => {
    const chain = buildAuditChain([
      entry({ action: "SECOND", timestamp: new Date("2026-10-21T10:00:00Z") }),
      entry({ action: "FIRST", timestamp: new Date("2026-10-20T10:00:00Z") }),
    ]);

    expect(chain.valid).toBe(true);
    expect(chain.count).toBe(2);
    expect(chain.entries[0].action).toBe("SECOND");
    expect(chain.entries[1].action).toBe("FIRST");
    expect(chain.entries[1].prevHash).toBe(GENESIS_HASH);
    expect(chain.entries[0].prevHash).toBe(chain.entries[1].hash);
    expect(chain.entries[0].block).toBe("#0002");
    expect(chain.head).toHaveLength(64);
    expect(chain.algorithm).toBe("SHA-256");
  });

  it("produces a stable head for identical ledgers", () => {
    const logs = [
      entry({ timestamp: new Date("2026-10-20T10:00:00Z") }),
      entry({
        action: "REMARK",
        entity_id: "AICTE/RB/2026/00002",
        timestamp: new Date("2026-10-22T10:00:00Z"),
      }),
    ];

    const first = buildAuditChain(logs);
    resetAuditAttestation();
    const second = buildAuditChain([...logs].reverse());

    expect(second.head).toBe(first.head);
    expect(second.valid).toBe(true);
  });

  it("detects an edited payload after the ledger was sealed", () => {
    const logs = [entry(), entry({ action: "REMARK", timestamp: new Date("2026-10-21T10:00:00Z") })];
    const sealed = buildAuditChain(logs);
    expect(sealed.valid).toBe(true);

    // Mutate a stored record, as an attacker with write access would.
    logs[0] = { ...logs[0], after: { status: "DISPOSED" } };

    const recheck = buildAuditChain(logs);
    expect(recheck.valid).toBe(false);
    expect(recheck.brokenAt).toBe(1);
    expect(recheck.head).not.toBe(sealed.head);
  });

  it("detects a deleted block", () => {
    const logs = [entry(), entry({ action: "REMARK", timestamp: new Date("2026-10-21T10:00:00Z") })];
    buildAuditChain(logs);

    const recheck = buildAuditChain([logs[0]]);
    expect(recheck.valid).toBe(false);
    expect(recheck.brokenAt).toBe(2);
  });

  it("extends the anchor when new blocks are appended", () => {
    const logs = [entry()];
    const first = buildAuditChain(logs);
    expect(first.count).toBe(1);

    logs.push(entry({ action: "DISPOSED", timestamp: new Date("2026-10-25T10:00:00Z") }));
    const second = buildAuditChain(logs);

    expect(second.valid).toBe(true);
    expect(second.count).toBe(2);
    expect(second.entries[1].hash).toBe(first.entries[0].hash);
  });

  it("hashes are sensitive to every sealed field", () => {
    const base = entry();
    const hash = hashEntry(1, GENESIS_HASH, base);

    expect(hashEntry(2, GENESIS_HASH, base)).not.toBe(hash);
    expect(hashEntry(1, "deadbeef", base)).not.toBe(hash);
    expect(hashEntry(1, GENESIS_HASH, { ...base, ip: "10.24.8.2" })).not.toBe(hash);
    expect(
      hashEntry(1, GENESIS_HASH, { ...base, after: { status: "DISPOSED" } })
    ).not.toBe(hash);
    expect(
      hashEntry(1, GENESIS_HASH, { ...base, timestamp: new Date("2026-10-20T10:00:01Z") })
    ).not.toBe(hash);
  });
});

describe("Seeded audit ledger stays append-only", () => {
  // The seed generator uses a fixed reference date; every historical action it
  // emits must fall on or before it so live session events always append.
  const SEED_REFERENCE = new Date("2026-10-26T12:00:00Z");

  function seededLogs() {
    const seed = generateSeedData();
    return seed.cases
      .flatMap((c) =>
        c.actions.map((a) => ({
          user: a.actor_user,
          action: a.action_type,
          entity: "CASE",
          entity_id: c.case_id,
          before: null,
          after: { status: c.status, bureau: c.assigned_bureau, priority: c.priority },
          ip: "10.24.8.1",
          timestamp: a.timestamp,
        }))
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 80);
  }

  beforeEach(() => {
    resetAuditAttestation();
  });

  it("never seeds actions after the seed reference date", () => {
    const logs = seededLogs();
    expect(logs.length).toBeGreaterThan(0);
    const newest = Math.max(...logs.map((l) => new Date(l.timestamp).getTime()));
    expect(newest).toBeLessThanOrEqual(SEED_REFERENCE.getTime());
  });

  it("keeps the anchored prefix valid when a newer login/logout is appended", () => {
    const logs: AuditEntry[] = [...seededLogs()];

    const history = buildAuditChain(logs);
    expect(history.valid).toBe(true);

    logs.unshift(
      entry({
        user: "admin@aicte.gov.in",
        action: "LOGIN",
        entity: "Session",
        entity_id: "u_admin",
        before: null,
        after: { role: "ADMIN" },
        timestamp: new Date(SEED_REFERENCE.getTime() + 60 * 60 * 1000),
      })
    );
    const afterLogin = buildAuditChain(logs);
    expect(afterLogin.valid).toBe(true);
    expect(afterLogin.count).toBe(history.count + 1);

    logs.unshift(
      entry({
        user: "admin@aicte.gov.in",
        action: "LOGOUT",
        entity: "Session",
        entity_id: "u_admin",
        before: null,
        after: { role: "ADMIN" },
        timestamp: new Date(SEED_REFERENCE.getTime() + 61 * 60 * 1000),
      })
    );
    const afterLogout = buildAuditChain(logs);
    expect(afterLogout.valid).toBe(true);
    expect(afterLogout.count).toBe(history.count + 2);
    expect(afterLogout.brokenAt).toBeNull();
  });
});
