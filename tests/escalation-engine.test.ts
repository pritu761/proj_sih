import { describe, it, expect } from "vitest";
import { generateSeedData } from "@/lib/mock-data-generator";
import {
  runAutoEscalation,
  buildEscalationMemo,
  AUTO_ESCALATION_GRACE_DAYS,
} from "@/lib/services/escalation-engine";
import type { StoreState } from "@/lib/services/persistence";
import type { SeedCase } from "@/lib/mock-data-generator";

const DAY = 86400000;

/** Mirrors buildSeedStore() without touching the repository (no DB wiring). */
function freshStore(): StoreState {
  const seed = generateSeedData();
  return {
    institutions: seed.institutions,
    cases: seed.cases,
    overlapAlerts: seed.overlapAlerts,
    caseLinks: [],
    notifications: [],
    comments: seed.comments,
    documents: seed.documents,
    users: [],
  };
}

function makeBreachedCase(overrides: Partial<SeedCase> = {}): SeedCase {
  const now = new Date();
  const received = new Date(now.getTime() - 90 * DAY);
  return {
    id: `test_${Math.random().toString(36).slice(2, 9)}`,
    case_id: `AICTE/RB/2026/9${Math.floor(Math.random() * 10000)}`,
    institution_id: "inst_001",
    date_received: received,
    source: "student",
    category: "Withholding Certificates",
    description: "Test fixture case for the auto-escalation engine.",
    status: "UNDER_PROCESS",
    assigned_bureau: "REGULATION_BUREAU",
    assigned_officer: "rb.officer@aicte.gov.in",
    last_action: "Desk scrutiny in progress",
    last_action_date: received,
    next_action_required: "Notice to institution",
    expected_disposal_date: new Date(now.getTime() - 20 * DAY), // 20d overdue
    priority: "HIGH",
    actions: [
      {
        actor_user: "rb.officer@aicte.gov.in",
        actor_bureau: "REGULATION_BUREAU",
        action_type: "RECEIVED",
        remarks: "Registered.",
        timestamp: received,
        attachments: [],
      },
    ],
    ...overrides,
  };
}

describe("Auto-escalation engine", () => {
  const now = new Date();

  it("escalates breached files past the grace window with a memo", async () => {
    const store = freshStore();
    store.cases.unshift(makeBreachedCase());

    const summary = await runAutoEscalation({ store, now, graceDays: 7 });

    expect(summary.escalated).toBeGreaterThanOrEqual(1);
    expect(summary.graceDays).toBe(7);

    const fixture = store.cases.find((c) => c.case_id.startsWith("AICTE/RB/2026/9"))!;
    expect(fixture.status).toBe("ESCALATED");
    expect(fixture.priority).toBe("CRITICAL");
    expect(fixture.actions[0].action_type).toBe("ESCALATED");
    expect(fixture.actions[0].actor_user).toBe("system@aicte.gov.in");
    expect(fixture.actions[0].remarks).toContain("AUTO-ESCALATION MEMORANDUM");
    expect(fixture.actions[0].remarks).toContain(fixture.case_id);
    expect(fixture.next_action_required).toContain("Competent Authority");

    expect(store.lastAutoEscalation).toBeDefined();
    // Digest notification summarises the sweep instead of flooding the bell.
    const digest = store.notifications.find((n) => n.type === "ESCALATION");
    expect(digest?.title).toContain("Auto-escalation digest");
  });

  it("respects the grace window: 1-day-overdue files stay untouched", async () => {
    const store = freshStore();
    const slightlyOverdue = makeBreachedCase({
      expected_disposal_date: new Date(now.getTime() - 1 * DAY),
      case_id: "AICTE/RB/2026/90001",
    });
    store.cases.unshift(slightlyOverdue);
    const beforeStatus = slightlyOverdue.status;

    await runAutoEscalation({ store, now, graceDays: AUTO_ESCALATION_GRACE_DAYS });

    expect(slightlyOverdue.status).toBe(beforeStatus);
    expect(slightlyOverdue.priority).not.toBe("CRITICAL");
  });

  it("never touches disposed, transferred or already-escalated files", async () => {
    const store = freshStore();
    store.cases.unshift(
      makeBreachedCase({ status: "DISPOSED", case_id: "AICTE/RB/2026/90002" }),
      makeBreachedCase({ status: "TRANSFERRED", case_id: "AICTE/RB/2026/90003" }),
      makeBreachedCase({ status: "ESCALATED", case_id: "AICTE/RB/2026/90004" })
    );

    const summary = await runAutoEscalation({ store, now, graceDays: 7 });

    for (const c of store.cases.slice(0, 3)) {
      if (c.case_id === "AICTE/RB/2026/90002") expect(c.status).toBe("DISPOSED");
      if (c.case_id === "AICTE/RB/2026/90003") expect(c.status).toBe("TRANSFERRED");
      if (c.case_id === "AICTE/RB/2026/90004") {
        expect(c.status).toBe("ESCALATED");
        expect(c.priority).not.toBe("CRITICAL");
      }
    }
    expect(summary.items).toBeDefined();
  });

  it("is idempotent within the same UTC day", async () => {
    const store = freshStore();
    store.cases.unshift(makeBreachedCase());

    const first = await runAutoEscalation({ store, now });
    const escalatedCount = first.escalated;
    expect(escalatedCount).toBeGreaterThan(0);

    // A second run the same day must not re-escalate anything.
    const second = await runAutoEscalation({ store, now });
    expect(second.escalated).toBe(0);
    expect(second.checked).toBe(0);

    // But forcing a re-run re-checks (already-escalated files are skipped).
    const forced = await runAutoEscalation({ store, now, force: true });
    expect(forced.escalated).toBe(0);
    expect(forced.alreadyEscalated).toBeGreaterThan(0);
  });

  it("builds a deterministic, reproducible memo", () => {
    const store = freshStore();
    const c = makeBreachedCase({ case_id: "AICTE/RB/2026/90005" });
    store.cases.unshift(c);
    const asOf = new Date("2026-11-13T10:00:00.000Z");

    const memo = buildEscalationMemo({
      caseItem: c,
      institutionName: "Apex Institute of Engineering & Technology",
      breachDays: 20,
      asOf,
    });
    const again = buildEscalationMemo({
      caseItem: c,
      institutionName: "Apex Institute of Engineering & Technology",
      breachDays: 20,
      asOf,
    });

    expect(memo).toBe(again);
    expect(memo).toContain("AICTE/RB/2026/90005");
    expect(memo).toContain("20 days overdue");
    expect(memo).toContain("Withholding Certificates");
  });
});
