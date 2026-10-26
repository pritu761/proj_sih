import { describe, it, expect } from "vitest";
import {
  canActOnCase,
  canViewCase,
  canCoordinateOverlap,
  assertCanActOnCase,
  SessionUser,
} from "@/lib/rbac";

describe("RBAC Unit Tests", () => {
  const adminUser: SessionUser = {
    id: "u1",
    name: "Admin",
    email: "admin@aicte.gov.in",
    role: "ADMIN",
    bureau: "ALL",
  };

  const chairmanUser: SessionUser = {
    id: "u2",
    name: "Chairman",
    email: "chairman@aicte.gov.in",
    role: "COMPETENT_AUTHORITY",
    bureau: "ALL",
  };

  const rbOfficer: SessionUser = {
    id: "u3",
    name: "RB Officer",
    email: "rb.officer@aicte.gov.in",
    role: "REGULATION_OFFICER",
    bureau: "REGULATION_BUREAU",
  };

  const pgrcOfficer: SessionUser = {
    id: "u4",
    name: "PGRC Officer",
    email: "pgrc.officer@aicte.gov.in",
    role: "PGRC_OFFICER",
    bureau: "PGRC",
  };

  const roNorthUser: SessionUser = {
    id: "u5",
    name: "RO North",
    email: "ro.north@aicte.gov.in",
    role: "REGIONAL_OFFICER",
    bureau: "ALL",
    region: "Northern",
  };

  const rbCase = {
    assigned_bureau: "REGULATION_BUREAU",
    institution: { region: "Northern" },
  };

  const pgrcCase = {
    assigned_bureau: "PGRC",
    institution: { region: "Southern" },
  };

  it("permits Admin and Competent Authority to act on any case", () => {
    expect(canActOnCase(adminUser, rbCase)).toBe(true);
    expect(canActOnCase(adminUser, pgrcCase)).toBe(true);
    expect(canActOnCase(chairmanUser, rbCase)).toBe(true);
    expect(canActOnCase(chairmanUser, pgrcCase)).toBe(true);
  });

  it("permits officers to act ONLY on their own bureau cases", () => {
    expect(canActOnCase(rbOfficer, rbCase)).toBe(true);
    expect(canActOnCase(rbOfficer, pgrcCase)).toBe(false);

    expect(canActOnCase(pgrcOfficer, pgrcCase)).toBe(true);
    expect(canActOnCase(pgrcOfficer, rbCase)).toBe(false);
  });

  it("restricts Regional Officers from mutating cases (read-only observer role)", () => {
    expect(canActOnCase(roNorthUser, rbCase)).toBe(false);
  });

  it("throws error in assertCanActOnCase when unauthorized", () => {
    expect(() => assertCanActOnCase(pgrcOfficer, rbCase)).toThrowError(
      /Unauthorized: User pgrc.officer@aicte.gov.in/
    );
  });

  it("enforces regional visibility boundaries for Regional Officers", () => {
    // RO North sees Northern cases
    expect(canViewCase(roNorthUser, rbCase)).toBe(true);
    // RO North cannot view Southern cases
    expect(canViewCase(roNorthUser, pgrcCase)).toBe(false);

    // Officers and Senior Management see all cases (Central Single Source of Truth)
    expect(canViewCase(rbOfficer, pgrcCase)).toBe(true);
    expect(canViewCase(chairmanUser, pgrcCase)).toBe(true);
  });

  it("checks overlap coordination permissions", () => {
    const alert = { bureaus_involved: ["PGRC", "REGULATION_BUREAU"] };
    expect(canCoordinateOverlap(adminUser, alert)).toBe(true);
    expect(canCoordinateOverlap(rbOfficer, alert)).toBe(true);
    expect(canCoordinateOverlap(pgrcOfficer, alert)).toBe(true);

    const abOfficer: SessionUser = {
      id: "u6",
      name: "AB Officer",
      email: "ab@aicte.gov.in",
      role: "BUREAU_OFFICER",
      bureau: "APPROVAL_BUREAU",
    };
    expect(canCoordinateOverlap(abOfficer, alert)).toBe(false);
  });
});
