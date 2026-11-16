import { afterEach, describe, expect, it, vi } from "vitest";
import repository from "@/lib/services/repository";
import prisma from "@/lib/prisma";

/**
 * In-app watcher digest at the repository seam. The GrievanceWatcher table is
 * stubbed — no live database is needed, and a missing/unreachable DB must
 * never break a case mutation.
 */
describe("Watcher status digest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function firstCase() {
    const page = await repository.getCases({ limit: 1 });
    const c = page.cases[0];
    expect(c).toBeTruthy();
    return c;
  }

  function watcher(email: string, caseId: string) {
    return { id: `w_${email}`, case_id: caseId, email, created_at: new Date() };
  }

  it("creates one digest per distinct watcher with a safe public projection", async () => {
    const c = await firstCase();
    const email = `digest.a.${Date.now()}@example.com`;
    vi.spyOn(prisma.grievanceWatcher, "findMany").mockResolvedValue([
      watcher(email, c.id),
      watcher(email.toUpperCase(), c.id), // same address twice → one entry
    ] as never);

    const added = await repository.notifyWatchersOfChange(
      c.id,
      "Status updated to DISPOSED."
    );
    expect(added).toBe(1);

    const digests = repository.getWatcherDigest(email);
    expect(digests).toHaveLength(1);
    expect(digests[0]).toMatchObject({
      registry_no: c.case_id,
      message: "Status updated to DISPOSED.",
    });
    expect(digests[0]).toHaveProperty("case_id", c.id);
    expect(digests[0].created_at).toBeInstanceOf(Date);
    // The projection never carries an email (not even the requester's).
    expect(digests[0]).not.toHaveProperty("email");
  });

  it("deduplicates identical (email, case, message, day) entries", async () => {
    const c = await firstCase();
    const email = `digest.b.${Date.now()}@example.com`;
    vi.spyOn(prisma.grievanceWatcher, "findMany").mockResolvedValue([
      watcher(email, c.id),
    ] as never);
    const message = `Hearing rescheduled ${Date.now()}`;

    expect(await repository.notifyWatchersOfChange(c.id, message)).toBe(1);
    expect(await repository.notifyWatchersOfChange(c.id, message)).toBe(0);
    expect(repository.getWatcherDigest(email).filter((d) => d.message === message)).toHaveLength(1);
  });

  it("scopes lookups to one email and never enumerates other citizens", async () => {
    const c = await firstCase();
    const stamp = Date.now();
    const a = `digest.c1.${stamp}@example.com`;
    const b = `digest.c2.${stamp}@example.com`;
    vi.spyOn(prisma.grievanceWatcher, "findMany").mockResolvedValue([
      watcher(a, c.id),
      watcher(b, c.id),
    ] as never);
    const message = `Scoped summary ${stamp}`;

    await repository.notifyWatchersOfChange(c.id, message);

    // Case-insensitive, trimmed lookup returns only that address's digest.
    const forA = repository.getWatcherDigest(`  ${a.toUpperCase()}  `);
    expect(forA).toHaveLength(1);
    expect(forA[0].message).toBe(message);
    expect(repository.getWatcherDigest(b)).toHaveLength(1);
    expect(repository.getWatcherDigest(`nobody.${stamp}@example.com`)).toHaveLength(0);
    expect(forA.every((d) => !("email" in d))).toBe(true);
  });

  it("does not throw when the database is unreachable or no watchers exist", async () => {
    const c = await firstCase();
    vi.spyOn(prisma.grievanceWatcher, "findMany").mockRejectedValueOnce(
      new Error("DB unreachable")
    );
    await expect(
      repository.notifyWatchersOfChange(c.id, `DB down ${Date.now()}`)
    ).resolves.toBe(0);

    vi.spyOn(prisma.grievanceWatcher, "findMany").mockResolvedValueOnce([] as never);
    await expect(
      repository.notifyWatchersOfChange(c.id, `No watchers ${Date.now()}`)
    ).resolves.toBe(0);

    expect(() => repository.getWatcherDigest("nobody@example.com")).not.toThrow();
    expect(repository.getWatcherDigest("nobody@example.com")).toEqual([]);
  });
});
