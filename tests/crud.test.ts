import { describe, it, expect } from "vitest";
import repository from "@/lib/services/repository";
import type { SessionUser } from "@/lib/rbac";
import { inMemoryAuditLogs } from "@/lib/services/audit";
import {
  overlapDetector,
  bestNameSimilarity,
  type CaseWithInstitution,
} from "@/lib/services/overlap-detector";
import { normalizeInstitutionName } from "@/lib/demo-data";

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

let seq = 100;
const nextAicteId = () => `1-9${String(seq++).padStart(9, "0")}`;

async function makeInstitution(name: string) {
  return repository.createInstitution(
    {
      name,
      aicte_permanent_id: nextAicteId(),
      address: "1 Test Campus Road",
      city: "Testpur",
      state: "Test State",
      pincode: "500001",
      region: "Southern",
      institution_type: "Engineering & Technology",
      contact_email: "office@test.edu.in",
      contact_phone: "9000000000",
    },
    ADMIN
  );
}

async function makeCase(aictePermanentId: string) {
  return repository.createCase(
    {
      aicte_permanent_id: aictePermanentId,
      source: "student",
      category: "Capitation Fee & Overcharging",
      description: "Students allege an unauthorised capitation fee collected before the semester examination.",
      assigned_bureau: "REGULATION_BUREAU",
      priority: "MEDIUM",
    },
    ADMIN
  );
}

describe("Institution CRUD (repository)", () => {
  it("creates an institution and writes an auditable master-data record", async () => {
    const inst = await makeInstitution("Test Valley Institute of Technology");

    expect(inst.id).toMatch(/^inst_/);
    expect(inst.normalized_name).toContain("test valley");
    expect(inst.aliases).toEqual([]);

    const view = await repository.getInstitutionById(inst.id, ADMIN);
    expect(view?.institution.name).toBe("Test Valley Institute of Technology");
    expect(
      inMemoryAuditLogs.some(
        (l) => l.action === "CREATE_INSTITUTION" && l.entity_id === inst.id
      )
    ).toBe(true);
  });

  it("manages aliases additively without overwriting the canonical name", async () => {
    const inst = await makeInstitution("Hilltop Institute of Management");
    const canonical = inst.normalized_name;

    const withAlias = await repository.addInstitutionAlias(
      inst.id,
      "Hilltop Business School",
      ADMIN
    );
    expect(withAlias.aliases).toContain("Hilltop Business School");
    expect(withAlias.normalized_name).toBe(canonical);

    // Adding the same alias twice is idempotent.
    await repository.addInstitutionAlias(inst.id, "hilltop business school", ADMIN);
    const after = await repository.getInstitutionById(inst.id, ADMIN);
    expect(after?.institution.aliases?.filter((a) => a.toLowerCase() === "hilltop business school")).toHaveLength(1);

    await repository.removeInstitutionAlias(inst.id, "Hilltop Business School", ADMIN);
    const removed = await repository.getInstitutionById(inst.id, ADMIN);
    expect(removed?.institution.aliases).not.toContain("Hilltop Business School");

    expect(inMemoryAuditLogs.some((l) => l.action === "ADD_INSTITUTION_ALIAS")).toBe(true);
    expect(inMemoryAuditLogs.some((l) => l.action === "REMOVE_INSTITUTION_ALIAS")).toBe(true);
  });
});

describe("Case correction / withdrawal CRUD", () => {
  it("corrects clerical fields with a reason, timeline entry and audit record", async () => {
    const inst = await makeInstitution("Correction Test Institute");
    const c = await makeCase(inst.aicte_permanent_id);

    const updated = await repository.correctCase(
      c.id,
      {
        priority: "HIGH",
        description: "Corrected representation: the fee was collected after the examination schedule was published.",
        reason: "Intake priority and narrative were transposed at registration.",
      },
      ADMIN
    );

    expect(updated.priority).toBe("HIGH");
    expect(updated.description).toContain("Corrected representation");
    expect(updated.actions[0].action_type).toBe("CASE_CORRECTED");
    expect(updated.actions[0].remarks).toContain("Intake priority and narrative");
    expect(
      inMemoryAuditLogs.some(
        (l) => l.action === "CASE_CORRECTED" && l.entity_id === c.case_id
      )
    ).toBe(true);
  });

  it("withdraws a wrongly filed case as DISPOSED with an additive marker", async () => {
    const inst = await makeInstitution("Withdrawal Test Institute");
    const c = await makeCase(inst.aicte_permanent_id);

    const updated = await repository.withdrawCase(
      c.id,
      "Filed against the wrong institution by mistake.",
      ADMIN
    );

    expect(updated.status).toBe("DISPOSED");
    expect(updated.withdrawn).toBe(true);
    expect(updated.withdrawn_reason).toContain("wrong institution");
    expect(updated.actions[0].action_type).toBe("CASE_WITHDRAWN");
    expect(updated.actions[0].remarks).toContain("WITHDRAWN:");
    expect(
      inMemoryAuditLogs.some(
        (l) => l.action === "CASE_WITHDRAWN" && l.entity_id === c.case_id
      )
    ).toBe(true);

    // Already-disposed cases cannot be withdrawn again.
    await expect(
      repository.withdrawCase(c.id, "Attempting a second withdrawal.", ADMIN)
    ).rejects.toThrow(/already been withdrawn/i);
  });
});

describe("Institution merge", () => {
  it("reassigns cases, documents and alerts, retains aliases and logs per-entity audit", async () => {
    const source = await makeInstitution("Merge Source Institute");
    const target = await makeInstitution("Merge Target Institute");
    const c = await makeCase(source.aicte_permanent_id);

    const result = await repository.mergeInstitutions(
      source.id,
      target.id,
      ADMIN,
      "Duplicate AICTE records for the same campus."
    );

    expect(result.movedCases).toBeGreaterThanOrEqual(1);
    const view = await repository.getCaseById(c.id, ADMIN);
    expect(view?.caseItem.institution_id).toBe(target.id);

    // Source identity is preserved as a target alias for entity resolution.
    const mergedTarget = await repository.getInstitutionById(target.id, ADMIN);
    expect(mergedTarget?.institution.aliases).toContain("Merge Source Institute");
    const mergedSource = await repository.getInstitutionById(source.id, ADMIN);
    expect(mergedSource?.institution.merged_into).toBe(target.id);

    expect(
      inMemoryAuditLogs.some(
        (l) => l.action === "MERGE_INSTITUTIONS" && l.entity_id === target.id
      )
    ).toBe(true);
    expect(
      inMemoryAuditLogs.some(
        (l) => l.action === "INSTITUTION_MERGED_INTO" && l.entity_id === source.id
      )
    ).toBe(true);
  });
});

describe("Alias-aware overlap detection", () => {
  const base: CaseWithInstitution = {
    id: "case_alias_a",
    case_id: "AICTE/RB/2026/90001",
    institution_id: "inst_alias_a",
    institution_aicte_id: "1-1111111111",
    institution_name: "Green Valley College",
    institution_normalized_name: normalizeInstitutionName("Green Valley College"),
    institution_city: "Testpur",
    institution_state: "Test State",
    institution_pincode: "500001",
    category: "Capitation Fee & Overcharging",
    description: "Students allege an unauthorised capitation fee collected before the semester examination.",
    assigned_bureau: "REGULATION_BUREAU",
    status: "UNDER_PROCESS",
    date_received: new Date("2026-10-01T00:00:00Z"),
  };

  const other: CaseWithInstitution = {
    ...base,
    id: "case_alias_b",
    case_id: "AICTE/PGRC/2026/90002",
    institution_id: "inst_alias_b",
    institution_aicte_id: "1-2222222222",
    institution_name: "North Star Institute of Technology",
    institution_normalized_name: normalizeInstitutionName("North Star Institute of Technology"),
    assigned_bureau: "PGRC",
  };

  it("treats alias-linked names as the same entity without changing the single-name path", async () => {
    // Different names, no aliases → no fuzzy entity match.
    const without = await overlapDetector.checkCase(
      { ...base, institution_aliases: [] },
      [other]
    );
    expect(without).toHaveLength(0);
    expect(bestNameSimilarity(base, other)).toBeLessThan(0.65);

    // An alias on the target bridges the two names.
    const withAlias = await overlapDetector.checkCase(
      {
        ...base,
        institution_aliases: ["North Star Engineering College"],
      },
      [other]
    );
    expect(withAlias.length).toBeGreaterThan(0);
    expect(
      withAlias[0].match_reasons.some((r) => r.rule === "FUZZY_NAME_AND_LOCATION")
    ).toBe(true);
    expect(withAlias[0].trilayer.entity.score).toBeGreaterThanOrEqual(80);
  });
});

describe("CRUD RBAC denial", () => {
  it("refuses case corrections from a non-owner bureau and master-data writes from non-admins", async () => {
    const inst = await makeInstitution("RBAC Test Institute");
    const c = await makeCase(inst.aicte_permanent_id);
    expect(c.assigned_bureau).toBe("REGULATION_BUREAU");

    await expect(
      repository.correctCase(
        c.id,
        { priority: "LOW", reason: "Unauthorised change attempt by another bureau." },
        PGRC_OFFICER
      )
    ).rejects.toThrow(/Unauthorized/);

    await expect(
      repository.createInstitution(
        {
          name: "Unauthorised Institute",
          aicte_permanent_id: nextAicteId(),
          address: "1 Test Road",
          city: "Testpur",
          state: "Test State",
          pincode: "500001",
          region: "Southern",
          institution_type: "Management",
        },
        PGRC_OFFICER
      )
    ).rejects.toThrow(/Unauthorized/);

    const other = await makeInstitution("RBAC Merge Target Institute");
    await expect(
      repository.mergeInstitutions(
        inst.id,
        other.id,
        RB_OFFICER,
        "Bureau officers cannot merge entities."
      )
    ).rejects.toThrow(/Unauthorized/);

    // Bureau officers may still edit master data per the documented rule.
    const edited = await repository.updateInstitution(
      inst.id,
      { city: "Updatedpur" },
      RB_OFFICER
    );
    expect(edited.city).toBe("Updatedpur");
  });
});
