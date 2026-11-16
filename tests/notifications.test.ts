import { describe, it, expect } from "vitest";
import repository from "@/lib/services/repository";
import type { OverlapCandidate } from "@/lib/services/overlap-detector";

/**
 * The cron sweeps create bell notifications from computed lists. Every sweep
 * is marked per UTC day so repeated cron runs never duplicate alerts.
 */
describe("Cron notification creation (repository)", () => {
  it("creates SLA notifications once per UTC day", async () => {
    const first = await repository.createSlaNotifications();
    expect(first).toBeGreaterThan(0);

    const stored = await repository.getNotifications();
    expect(
      stored.some(
        (n) => n.type === "SLA_BREACHED" || n.type === "SLA_APPROACHING"
      )
    ).toBe(true);

    const second = await repository.createSlaNotifications();
    expect(second).toBe(0);
  });

  it("creates hearing reminder notifications once per UTC day", async () => {
    const first = await repository.createReminderNotifications();
    expect(first).toBeGreaterThanOrEqual(0);

    const second = await repository.createReminderNotifications();
    expect(second).toBe(0);
  });

  it("creates overlap notifications once per UTC day", async () => {
    const candidate = {
      institution_id: "inst_test",
      case_ids: ["AICTE/TEST/2026/00001", "AICTE/TEST/2026/00002"],
      bureaus_involved: ["PGRC", "REGULATION_BUREAU"],
      confidence: "HIGH",
      match_reasons: [],
      trilayer: { entity: {}, semantic: {}, temporal: {}, total: 90 },
    } as unknown as OverlapCandidate;

    const first = await repository.createOverlapNotifications([candidate]);
    expect(first).toBe(1);

    const second = await repository.createOverlapNotifications([candidate]);
    expect(second).toBe(0);
  });
});
