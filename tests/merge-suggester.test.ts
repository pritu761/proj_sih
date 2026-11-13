import { describe, it, expect } from "vitest";
import { findMergeSuggestions } from "@/lib/services/merge-suggester";
import type { SeedCase, SeedInstitution } from "@/lib/mock-data-generator";

const DAY = 86400000;

const IDENTICAL_DESC =
  "The institution is withholding original certificates of final semester students even though the university declared their results three months ago and all dues are cleared.";

const UNRELATED_DESC =
  "Hostel water pump has been broken since the last monsoon season and no repair work has started on the campus block.";

function instFixture(id: string, name: string): SeedInstitution {
  return {
    id,
    aicte_permanent_id: `1-${id.replace(/\D/g, "").padStart(7, "0")}`,
    name,
    normalized_name: name.toLowerCase(),
    address: "Plot 12, Sector 9, Test City",
    city: "Test City",
    state: "Test State",
    pincode: "110001",
    region: "Northern",
    institution_type: "Engineering",
    contact_email: `contact@${id}.test`,
    contact_phone: "011-00000000",
  };
}

function caseFixture(overrides: Partial<SeedCase>): SeedCase {
  const now = Date.now();
  const received = overrides.date_received ?? new Date(now - 10 * DAY);
  return {
    id: `fx_${Math.random().toString(36).slice(2, 9)}`,
    case_id: `AICTE/RB/2026/7${Math.floor(Math.random() * 10000)}`,
    institution_id: "inst_a",
    date_received: received,
    source: "student",
    category: "Withholding Certificates",
    description: IDENTICAL_DESC,
    status: "UNDER_PROCESS",
    assigned_bureau: "REGULATION_BUREAU",
    assigned_officer: "rb.officer@aicte.gov.in",
    last_action: "Registered on portal",
    last_action_date: received,
    next_action_required: null,
    expected_disposal_date: new Date(new Date(received).getTime() + 30 * DAY),
    priority: "MEDIUM",
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

describe("Merge suggestion engine (same-bureau duplicates)", () => {
  it("surfaces a same-institution, same-category pair with near-identical narratives", () => {
    const inst = instFixture("inst_a", "Apex Institute of Engineering & Technology");
    const cases = [
      caseFixture({ institution_id: inst.id }),
      caseFixture({ institution_id: inst.id, status: "PENDING" }),
    ];

    const suggestions = findMergeSuggestions({ cases, institutions: [inst] });

    expect(suggestions.length).toBe(1);
    // Identical narratives → similarity 1.0 (60 pts) + ≤30-day burst (+25).
    expect(suggestions[0].score).toBe(85);
    expect(suggestions[0].confidence).toBe("HIGH");
    expect(suggestions[0].textSimilarity).toBe(1);
    expect(suggestions[0].rationale.join(" ")).toContain("100% narrative similarity");
    expect(suggestions[0].rationale.join(" ")).toContain("burst window");
  });

  it("recommends the earliest-filed side as the master docket", () => {
    const inst = instFixture("inst_a", "Apex Institute of Engineering & Technology");
    const earlier = caseFixture({
      case_id: "AICTE/RB/2026/70001",
      date_received: new Date(Date.now() - 14 * DAY),
    });
    const later = caseFixture({
      case_id: "AICTE/RB/2026/70002",
      date_received: new Date(Date.now() - 2 * DAY),
    });
    // The later filing is listed first — order in the array must not matter.
    const suggestions = findMergeSuggestions({
      cases: [later, earlier],
      institutions: [inst],
    });

    expect(suggestions[0].a.case_id).toBe("AICTE/RB/2026/70001");
    expect(suggestions[0].b.case_id).toBe("AICTE/RB/2026/70002");
    expect(suggestions[0].key).toBe(
      [earlier.id, later.id].sort().join("::")
    );
  });

  it("applies confidence tiers from the filing burst windows", () => {
    const inst = instFixture("inst_a", "Apex Institute of Engineering & Technology");

    // Identical text + 45 days apart → 60 + 12 = 72 → MEDIUM.
    const quarter = findMergeSuggestions({
      cases: [
        caseFixture({ date_received: new Date(Date.now() - 50 * DAY) }),
        caseFixture({ date_received: new Date(Date.now() - 5 * DAY) }),
      ],
      institutions: [inst],
    });
    expect(quarter[0]?.score).toBe(72);
    expect(quarter[0]?.confidence).toBe("MEDIUM");

    // Identical text + 120 days apart → 60 + 4 = 64 → LOW.
    const stale = findMergeSuggestions({
      cases: [
        caseFixture({ date_received: new Date(Date.now() - 125 * DAY) }),
        caseFixture({ date_received: new Date(Date.now() - 5 * DAY) }),
      ],
      institutions: [inst],
    });
    expect(stale[0]?.score).toBe(64);
    expect(stale[0]?.confidence).toBe("LOW");
  });

  it("excludes pairs whose narratives are dissimilar", () => {
    const inst = instFixture("inst_a", "Apex Institute of Engineering & Technology");
    const suggestions = findMergeSuggestions({
      cases: [
        caseFixture({ description: IDENTICAL_DESC }),
        caseFixture({ description: UNRELATED_DESC }),
      ],
      institutions: [inst],
    });

    expect(suggestions).toEqual([]);
  });

  it("never groups across institutions or across categories", () => {
    const instA = instFixture("inst_a", "Apex Institute of Engineering & Technology");
    const instB = instFixture("inst_b", "Beacon College of Engineering & Technology");

    // Same category, identical text, different institutions → no pair.
    expect(
      findMergeSuggestions({
        cases: [
          caseFixture({ institution_id: instA.id }),
          caseFixture({ institution_id: instB.id }),
        ],
        institutions: [instA, instB],
      })
    ).toEqual([]);

    // Same institution, identical text, different categories → no pair.
    expect(
      findMergeSuggestions({
        cases: [
          caseFixture({ category: "Withholding Certificates" }),
          caseFixture({ category: "Capitation Fee & Overcharging" }),
        ],
        institutions: [instA],
      })
    ).toEqual([]);
  });

  it("only considers open desk files and substantive narratives", () => {
    const inst = instFixture("inst_a", "Apex Institute of Engineering & Technology");

    expect(
      findMergeSuggestions({
        cases: [
          caseFixture({ status: "DISPOSED" }),
          caseFixture({ status: "DISPOSED" }),
        ],
        institutions: [inst],
      })
    ).toEqual([]);

    expect(
      findMergeSuggestions({
        cases: [
          caseFixture({ status: "ESCALATED" }),
          caseFixture({ status: "PENDING" }),
        ],
        institutions: [inst],
      })
    ).toEqual([]);

    expect(
      findMergeSuggestions({
        cases: [
          caseFixture({ description: "Fee refund pending." }), // < 30 chars
          caseFixture({ description: "Fee refund pending." }),
        ],
        institutions: [inst],
      })
    ).toEqual([]);
  });

  it("keeps a reviewed pair out of the queue via its dismissal key", () => {
    const inst = instFixture("inst_a", "Apex Institute of Engineering & Technology");
    const a = caseFixture({});
    const b = caseFixture({});
    const pairKey = [a.id, b.id].sort().join("::");

    const first = findMergeSuggestions({ cases: [a, b], institutions: [inst] });
    expect(first.map((s) => s.key)).toContain(pairKey);

    const afterDismissal = findMergeSuggestions({
      cases: [a, b],
      institutions: [inst],
      dismissedKeys: [pairKey],
    });
    expect(afterDismissal.map((s) => s.key)).not.toContain(pairKey);
  });

  it("respects the result limit, highest scores first", () => {
    const instA = instFixture("inst_a", "Apex Institute of Engineering & Technology");
    const instB = instFixture("inst_b", "Beacon College of Engineering & Technology");

    const suggestions = findMergeSuggestions({
      cases: [
        // Pair 1 (inst_a): filed 45 days apart → 72 (MEDIUM).
        caseFixture({
          institution_id: instA.id,
          date_received: new Date(Date.now() - 50 * DAY),
        }),
        caseFixture({
          institution_id: instA.id,
          date_received: new Date(Date.now() - 5 * DAY),
        }),
        // Pair 2 (inst_b): filed 3 days apart → 85 (HIGH, sorts first).
        caseFixture({
          institution_id: instB.id,
          date_received: new Date(Date.now() - 8 * DAY),
        }),
        caseFixture({
          institution_id: instB.id,
          date_received: new Date(Date.now() - 5 * DAY),
        }),
      ],
      institutions: [instA, instB],
      limit: 1,
    });

    expect(suggestions.length).toBe(1);
    expect(suggestions[0].a.institution_name).toBe(instB.name);
    expect(suggestions[0].score).toBe(85);
  });
});
