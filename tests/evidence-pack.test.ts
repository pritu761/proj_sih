import { describe, it, expect } from "vitest";
import repository from "@/lib/services/repository";
import type { SessionUser } from "@/lib/rbac";

const ADMIN: SessionUser = {
  id: "usr_admin_001",
  name: "Dr. Rajesh Sharma",
  email: "admin@aicte.gov.in",
  role: "ADMIN",
  bureau: "ALL",
};

/** A regional officer scoped to a region no institution belongs to. */
const OUTSIDE_REGION: SessionUser = {
  id: "usr_ro_test",
  name: "Outside Observer",
  email: "ro.outside@aicte.gov.in",
  role: "REGIONAL_OFFICER",
  bureau: "ALL",
  region: "__no_such_region__",
};

/**
 * Per-case evidence pack data assembly, exercised at the repository seam the
 * authenticated route handler calls. Uses the shared seeded store like the
 * running demo.
 */
describe("Per-case evidence pack (repository)", () => {
  it("assembles every exhibit for the registry anchor case", async () => {
    const view = await repository.getCaseById("case_00101", ADMIN);
    expect(view).toBeTruthy();

    const result = await repository.getCaseEvidencePack(view!.caseItem.id, ADMIN);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const pack = result.data;
    expect(pack.registryNumber).toBe("AICTE/PGRC/2026/00101");
    expect(pack.internalId).toBe(view!.caseItem.id);
    expect(pack.institutionName).toContain("Apex");
    expect(pack.category).toBeTruthy();
    expect(pack.status).toBeTruthy();
    expect(pack.priority).toBeTruthy();
    expect(pack.receivedDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(pack.sla.timelineDays).toBeGreaterThan(0);
    expect(pack.description.length).toBeGreaterThan(0);

    // Timeline is assembled from the case's canonical action history.
    expect(pack.timeline.length).toBeGreaterThan(0);
    expect(pack.timeline[0]).toHaveProperty("at");
    expect(pack.timeline[0]).toHaveProperty("actor");
    expect(pack.timeline[0]).toHaveProperty("type");
    expect(pack.timeline[0]).toHaveProperty("remarks");

    // Linked cases and overlap alerts are projections of existing store data.
    expect(Array.isArray(pack.linkedCases)).toBe(true);
    expect(Array.isArray(pack.overlapAlerts)).toBe(true);

    // Attestation comes from the live tamper-evident audit chain.
    expect(pack.audit?.algorithm).toBe("SHA-256");
    expect(pack.audit?.head).toMatch(/^[a-f0-9]+$/);
    expect(pack.audit?.count).toBeGreaterThan(0);
    expect(typeof pack.audit?.valid).toBe("boolean");
  });

  it("surfaces citizen feedback when the disposed file has a rating", async () => {
    const page = await repository.getCases({ status: "DISPOSED", limit: 1 });
    const disposed = page.cases[0];
    expect(disposed).toBeTruthy();

    repository.submitPublicFeedback(disposed.case_id, {
      rating: 5,
      comment: "Grievance closed to my satisfaction - pack should show this.",
    });

    const result = await repository.getCaseEvidencePack(disposed.id, ADMIN);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.data.feedback?.rating).toBe(5);
    expect(result.data.feedback?.comment).toContain("pack should show this");
    expect(result.data.feedback?.at).toBeTruthy();
  });

  it("does not leak a case to an out-of-region officer or an anonymous caller", async () => {
    const view = await repository.getCaseById("case_00101", ADMIN);
    expect(view).toBeTruthy();

    const outsider = await repository.getCaseEvidencePack(
      view!.caseItem.id,
      OUTSIDE_REGION
    );
    expect(outsider.status).toBe("forbidden");

    const anonymous = await repository.getCaseEvidencePack(view!.caseItem.id);
    expect(anonymous.status).toBe("forbidden");
  });

  it("reports a missing case distinctly from a forbidden one", async () => {
    const missing = await repository.getCaseEvidencePack(
      "case_does_not_exist",
      ADMIN
    );
    expect(missing.status).toBe("not_found");
  });
});
