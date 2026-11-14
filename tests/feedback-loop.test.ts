import { describe, it, expect } from "vitest";
import repository from "@/lib/services/repository";

/**
 * The citizen feedback loop, end to end at the repository seam:
 *   submit feedback on a disposed file → public projection → transparency stats.
 * Uses the shared seeded store (global, like the running demo).
 */
describe("Citizen feedback loop (repository)", () => {
  it("records feedback on a disposed file and exposes it through the public projection", async () => {
    const page = await repository.getCases({ status: "DISPOSED", limit: 1 });
    const disposed = page.cases[0];
    expect(disposed).toBeTruthy();

    const res = repository.submitPublicFeedback(disposed.case_id, {
      rating: 5,
      comment: "Refund received in full; tracker was updated promptly.",
    });
    expect(res.ok).toBe(true);
    expect(res.rating).toBe(5);

    const status = repository.getPublicCaseStatus(disposed.case_id);
    expect(status?.feedback_rating).toBe(5);
    expect(status?.feedback_comment).toContain("Refund received");
    expect(status?.feedback_at).toBeTruthy();

    // Latest submission wins (a citizen may revise their rating).
    repository.submitPublicFeedback(disposed.case_id, { rating: 3 });
    expect(repository.getPublicCaseStatus(disposed.case_id)?.feedback_rating).toBe(3);
  });

  it("feeds the transparency page's quality-of-redressal metrics", async () => {
    const s = repository.getPublicTransparencyStats();

    expect(s.feedbackCount).toBeGreaterThan(0);
    expect(s.avgFeedback).toBeGreaterThanOrEqual(1);
    expect(s.avgFeedback).toBeLessThanOrEqual(5);
    expect(s.satisfactionRate).toBeGreaterThanOrEqual(0);
    expect(s.satisfactionRate).toBeLessThanOrEqual(100);

    const mixTotal = s.ratingMix.reduce((sum, r) => sum + r.count, 0);
    expect(mixTotal).toBe(s.feedbackCount);
    // Star buckets are ordered 5 → 1.
    expect(s.ratingMix.map((r) => r.stars)).toEqual([5, 4, 3, 2, 1]);
  });

  it("rejects feedback on open files and unknown registry numbers", async () => {
    const page = await repository.getCases({ status: "UNDER_PROCESS", limit: 1 });
    const open = page.cases[0];
    expect(open).toBeTruthy();

    expect(() =>
      repository.submitPublicFeedback(open.case_id, { rating: 4 })
    ).toThrow(/disposed/i);

    expect(() =>
      repository.submitPublicFeedback("AICTE/ZZ/2099/99999", { rating: 4 })
    ).toThrow(/No grievance is registered/i);
  });
});
