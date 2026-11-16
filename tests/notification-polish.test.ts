import { describe, it, expect } from "vitest";
import repository from "@/lib/services/repository";
import type { SessionUser } from "@/lib/rbac";
import type { StoreNotification } from "@/lib/services/persistence";

const ADMIN: SessionUser = {
  id: "usr_admin_001",
  name: "Dr. Rajesh Sharma",
  email: "admin@aicte.gov.in",
  role: "ADMIN",
  bureau: "ALL",
};

const RB_OFFICER: SessionUser = {
  id: "usr_rb_007",
  name: "RB Officer",
  email: "rb.officer@aicte.gov.in",
  role: "REGULATION_OFFICER",
  bureau: "REGULATION_BUREAU",
};

const PGRC_OFFICER: SessionUser = {
  id: "usr_pgrc_008",
  name: "PGRC Officer",
  email: "pgrc.officer@aicte.gov.in",
  role: "PGRC_OFFICER",
  bureau: "PGRC",
};

const IDS = {
  all: "notif_polish_all",
  pgrc: "notif_polish_pgrc",
  rb: "notif_polish_rb",
  approval: "notif_polish_approval",
} as const;

/** The repository anchors the live store on globalThis (see repository.ts). */
function liveNotifications(): StoreNotification[] {
  const store = (globalThis as unknown as { inMemoryData?: { notifications: StoreNotification[] } })
    .inMemoryData;
  if (!store) throw new Error("in-memory store has not been initialised");
  return store.notifications;
}

/**
 * (Re)seed four deterministic, unread notifications with distinct targets and
 * reset their read state so each test is independent of the others and of the
 * shared demo seed.
 */
async function seed() {
  await repository.getNotifications(); // force store construction
  const store = liveNotifications();
  const specs: { id: string; target_bureau: string }[] = [
    { id: IDS.all, target_bureau: "ALL" },
    { id: IDS.pgrc, target_bureau: "PGRC" },
    { id: IDS.rb, target_bureau: "REGULATION_BUREAU" },
    { id: IDS.approval, target_bureau: "APPROVAL_BUREAU" },
  ];
  for (const spec of specs) {
    let notif = store.find((n) => n.id === spec.id);
    if (!notif) {
      notif = {} as StoreNotification;
      store.push(notif);
    }
    Object.assign(notif, {
      id: spec.id,
      type: "OVERLAP",
      case_id: "case_00101",
      target_bureau: spec.target_bureau,
      title: spec.id,
      message: "Bulk mark-read visibility probe.",
      read: false,
      created_at: new Date("2026-11-01T00:00:00Z"),
    });
  }
}

async function readStateByTestId() {
  const byId = new Map<string, boolean>();
  for (const n of await repository.getNotifications(ADMIN)) {
    if (Object.values(IDS).includes(n.id as (typeof IDS)[keyof typeof IDS])) {
      byId.set(n.id, n.read);
    }
  }
  return byId;
}

describe("Bulk mark notifications read (repository)", () => {
  it("limits a bureau officer to its own bureau and ALL-targeted notifications", async () => {
    await seed();
    const changed = await repository.markAllNotificationsRead(RB_OFFICER);

    // RB + ALL at minimum (the shared seed may contribute more RB rows).
    expect(changed).toBeGreaterThanOrEqual(2);

    const state = await readStateByTestId();
    expect(state.get(IDS.rb)).toBe(true);
    expect(state.get(IDS.all)).toBe(true);
    // Another bureau's bell is never cleared by a REGULATION_OFFICER.
    expect(state.get(IDS.pgrc)).toBe(false);
    expect(state.get(IDS.approval)).toBe(false);
  });

  it("applies the same visibility rule to a PGRC officer", async () => {
    await seed();
    await repository.markAllNotificationsRead(PGRC_OFFICER);

    const state = await readStateByTestId();
    expect(state.get(IDS.pgrc)).toBe(true);
    expect(state.get(IDS.all)).toBe(true);
    expect(state.get(IDS.rb)).toBe(false);
    expect(state.get(IDS.approval)).toBe(false);
  });

  it("lets an ADMIN mark every notification read and drops unread counts to zero", async () => {
    await seed();
    const before = (await repository.getNotifications(ADMIN)).filter((n) => !n.read).length;
    expect(before).toBeGreaterThan(0);

    const changed = await repository.markAllNotificationsRead(ADMIN);
    expect(changed).toBe(before);

    const after = (await repository.getNotifications(ADMIN)).filter((n) => !n.read).length;
    expect(after).toBe(0);
    expect(changed).toBeGreaterThanOrEqual(4);

    const state = await readStateByTestId();
    for (const id of Object.values(IDS)) expect(state.get(id)).toBe(true);
  });

  it("is idempotent on repeated calls", async () => {
    await seed();
    const first = await repository.markAllNotificationsRead(ADMIN);
    expect(first).toBeGreaterThan(0);
    const second = await repository.markAllNotificationsRead(ADMIN);
    expect(second).toBe(0);

    // A bureau officer repeating the call also sees nothing left to clear.
    expect(await repository.markAllNotificationsRead(RB_OFFICER)).toBe(0);
  });
});
