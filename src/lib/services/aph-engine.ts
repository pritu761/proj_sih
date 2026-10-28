/**
 * AICTE statutory enforcement engine
 * --------------------------------
 * Maps grievance categories to Approval Process Handbook (APH) obligations,
 * computes an explainable institutional compliance-risk score, and determines
 * whether Extension of Approval (EoA) scrutiny, an Expert Visit Committee
 * (EVC), or a statutory Show-Cause Notice is warranted.
 *
 * All weights are deterministic and surfaced as drivers — no black box.
 */

export type ComplianceBand = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

export interface AphClause {
  code: string;
  chapter: string;
  title: string;
  requirement: string;
  consequence: string;
}

export interface ComplianceDriver {
  label: string;
  points: number;
  detail: string;
}

export interface ComplianceCaseInput {
  id: string;
  case_id: string;
  category: string;
  status: string;
  priority: string;
  assigned_bureau: string;
  date_received: Date | string;
  sla?: {
    isBreached: boolean;
    isApproaching: boolean;
    remainingDays: number;
    timelineDays: number;
  };
}

export interface ComplianceAlertInput {
  id: string;
  status: string;
  case_ids: string[];
  confidence: string;
  bureaus_involved?: string[];
  master_case_id?: string | null;
}

export interface InstitutionComplianceInput {
  id: string;
  name: string;
  aicte_permanent_id: string;
  city?: string;
  state?: string;
  region?: string;
  institution_type?: string;
}

export interface ComplianceAssessment {
  institutionId: string;
  institutionName: string;
  aictePermanentId: string;
  score: number;
  band: ComplianceBand;
  bandLabel: string;
  drivers: ComplianceDriver[];
  activeCases: number;
  disposedCases: number;
  slaBreaches: number;
  openOverlaps: number;
  activeBureaus: string[];
  repeatCategories: { category: string; count: number }[];
  eoa: {
    flag: boolean;
    headline: string;
    recommendation: string;
    conditions: string[];
  };
  evc: {
    flag: boolean;
    headline: string;
    scope: string[];
  };
  showCauseEligible: boolean;
  aphClauses: AphClause[];
  regulatoryCategories: string[];
  asOf: string;
}

const REGULATORY_CATEGORIES = new Set([
  "Ragging & Safety Violations",
  "Withholding Certificates",
  "Capitation Fee & Overcharging",
  "Unapproved Courses & Seats",
  "Admission Irregularities",
  "Faculty Non-Payment & Harassment",
]);

const APH_BY_CATEGORY: Record<string, AphClause[]> = {
  "Capitation Fee & Overcharging": [
    {
      code: "APH 2026-27 Cl. 2.4.2",
      chapter: "Chapter II — Fee, Admission & Intake",
      title: "Prohibition of capitation fee",
      requirement:
        "No technical institution shall collect any amount other than the fee approved by the Fee Fixation Committee. Every receipt must be issued through the institution's audited bank account.",
      consequence:
        "Fee refund to affected students, conditions on Extension of Approval, and penalty proceedings under Cl. 12.3 of the APH.",
    },
    {
      code: "AICTE (Fee) Regulations 2024, Reg. 5(3)",
      chapter: "Fee Regulation",
      title: "Transparent fee disclosure",
      requirement:
        "The approved fee structure and all mandatory charges must be displayed on the institution website and notice board before the counselling round.",
      consequence:
        "Regulatory warning, withdrawal of management-quota seats, and reference to the state fee regulatory authority.",
    },
  ],
  "Withholding Certificates": [
    {
      code: "APH 2026-27 Cl. 4.9.1",
      chapter: "Chapter IV — Student Entitlements",
      title: "Non-retention of original documents",
      requirement:
        "Original certificates, marksheets, migration certificates and degree documents shall not be retained after admission or on completion of the programme for any unpaid dues.",
      consequence:
        "Immediate release of documents, compensation to the complainant, and adverse entry in the institution's compliance record.",
    },
    {
      code: "AICTE (Grievance Redressal) Regulations 2023, Reg. 8",
      chapter: "Student Grievance Redressal",
      title: "Statutory disposal timeline",
      requirement:
        "Student grievances relating to certificates must be disposed of within 15 days of receipt by the Institutional Grievance Redressal Committee.",
      consequence:
        "Escalation to PGRC and a written show-cause notice to the principal for delay.",
    },
  ],
  "Faculty Non-Payment & Harassment": [
    {
      code: "APH 2026-27 Cl. 5.3.4",
      chapter: "Chapter V — Faculty & Staff Norms",
      title: "Payment of prescribed pay scales",
      requirement:
        "Faculty shall be paid the 7th CPC-equivalent pay scale, DA and arrears through bank transfer on or before the last working day of every month; EPF and ESI contributions must be deposited statutorily.",
      consequence:
        "EVC verification of payroll, withholding of faculty-related approval, and recovery proceedings against the trust.",
    },
    {
      code: "AICTE (Prevention of Harassment) Regulations 2022, Reg. 6",
      chapter: "Faculty Welfare",
      title: "Functional Internal Complaints Committee",
      requirement:
        "Every institution shall constitute a duly notified Internal Complaints Committee and complete inquiry within 90 days of a written complaint.",
      consequence:
        "EVC scrutiny, suspension of new faculty approvals, and reference to the state women's commission where applicable.",
    },
  ],
  "Unapproved Courses & Seats": [
    {
      code: "APH 2026-27 Cl. 1.4.3",
      chapter: "Chapter I — Grant of Approval",
      title: "Approved intake matrix",
      requirement:
        "Admission shall be made only against the sanctioned intake and approved programme list communicated in the Extension of Approval letter for the academic year.",
      consequence:
        "Cancellation of unapproved admissions, intake reduction, and EoA refused for the next academic year.",
    },
    {
      code: "AICTE (Grant of Approval) Regulations 2024, Reg. 11",
      chapter: "Extension of Approval",
      title: "Prior approval before admission",
      requirement:
        "No new course, additional shift, or increased intake may be advertised or admitted without a prior Extension of Approval and a valid EVC report.",
      consequence:
        "Show-cause notice, penal action under Reg. 14, and referral to the affiliating university.",
    },
  ],
  "Ragging & Safety Violations": [
    {
      code: "APH 2026-27 Cl. 4.2.1",
      chapter: "Chapter IV — Student Safety",
      title: "Anti-ragging mechanism",
      requirement:
        "Institutions shall constitute an anti-ragging committee and squad, display helpline numbers, and report every incident to the police and the AICTE portal within 24 hours.",
      consequence:
        "Immediate EVC inspection, suspension of hostel approval, and initiation of penal proceedings against the principal.",
    },
    {
      code: "AICTE (Ragging Prevention) Regulations 2024, Reg. 7",
      chapter: "Campus Safety",
      title: "Fire and structural safety certification",
      requirement:
        "Hostels, laboratories and kitchens shall hold a valid fire-safety certificate and structural stability certificate, renewed annually.",
      consequence:
        "Closure of unsafe facilities and a condition precedent for EoA renewal.",
    },
  ],
  "Admission Irregularities": [
    {
      code: "APH 2026-27 Cl. 2.1.6",
      chapter: "Chapter II — Admissions",
      title: "Merit-based admission",
      requirement:
        "All admissions, including management quota, shall be made from valid common entrance test ranks and the state counselling process; cash payments and seat-blocking letters are prohibited.",
      consequence:
        "Cancellation of irregular admissions, fee refund, and reduction of approved intake.",
    },
  ],
  "Infrastructure & Lab Deficiencies": [
    {
      code: "APH 2026-27 Cl. 3.2.5",
      chapter: "Chapter III — Infrastructure & Learning Resources",
      title: "Laboratory and library adequacy",
      requirement:
        "Each approved programme shall maintain functional equipment, prescribed laboratory space, safety guards and current journal subscriptions as per the APH facility matrix.",
      consequence:
        "EVC verification, intake reduction for deficient programmes, and a time-bound compliance plan.",
    },
  ],
  "Other Institutional Grievances": [
    {
      code: "APH 2026-27 Cl. 12.1.2",
      chapter: "Chapter XII — Compliance & Disclosure",
      title: "Mandatory disclosure and grievance mechanism",
      requirement:
        "Institutions shall publish the mandatory disclosure, fee structure and grievance redressal contact on their website and constitute an Institutional Grievance Redressal Committee.",
      consequence:
        "Compliance advisory, followed by a show-cause notice if the deficiency continues beyond 30 days.",
    },
  ],
};

export function getAphClauses(category: string): AphClause[] {
  return APH_BY_CATEGORY[category] ?? APH_BY_CATEGORY["Other Institutional Grievances"];
}

export function isRegulatoryCategory(category: string): boolean {
  return REGULATORY_CATEGORIES.has(category);
}

function bandFor(score: number): { band: ComplianceBand; label: string } {
  if (score >= 75) return { band: "CRITICAL", label: "Critical compliance exposure" };
  if (score >= 50) return { band: "HIGH", label: "High compliance exposure" };
  if (score >= 30) return { band: "MODERATE", label: "Moderate compliance exposure" };
  return { band: "LOW", label: "Low compliance exposure" };
}

export function assessInstitutionCompliance(
  institution: InstitutionComplianceInput,
  cases: ComplianceCaseInput[],
  alerts: ComplianceAlertInput[]
): ComplianceAssessment {
  const activeCases = cases.filter((c) => c.status !== "DISPOSED");
  const disposedCases = cases.length - activeCases.length;
  const slaBreaches = activeCases.filter((c) => c.sla?.isBreached).length;
  const openOverlaps = alerts.filter((a) => a.status === "OPEN").length;
  const activeBureaus = Array.from(
    new Set(activeCases.map((c) => c.assigned_bureau))
  );

  const categoryCounts = new Map<string, number>();
  for (const c of cases) {
    categoryCounts.set(c.category, (categoryCounts.get(c.category) ?? 0) + 1);
  }
  const repeatCategories = Array.from(categoryCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const regulatoryCategories = Array.from(
    new Set(activeCases.map((c) => c.category).filter(isRegulatoryCategory))
  );

  const drivers: ComplianceDriver[] = [];
  let score = 0;

  const casePoints = Math.min(25, activeCases.length * 5);
  if (casePoints > 0) {
    score += casePoints;
    drivers.push({
      label: "Active complaint load",
      points: casePoints,
      detail: `${activeCases.length} live file${activeCases.length === 1 ? "" : "s"} across ${activeBureaus.length} bureau${activeBureaus.length === 1 ? "" : "s"}.`,
    });
  }

  const breachPoints = Math.min(30, slaBreaches * 15);
  if (breachPoints > 0) {
    score += breachPoints;
    drivers.push({
      label: "Statutory SLA breaches",
      points: breachPoints,
      detail: `${slaBreaches} file${slaBreaches === 1 ? "" : "s"} past the category timeline.`,
    });
  }

  const overlapPoints = Math.min(24, openOverlaps * 12);
  if (overlapPoints > 0) {
    score += overlapPoints;
    drivers.push({
      label: "Parallel bureau inquiries",
      points: overlapPoints,
      detail: `${openOverlaps} open collision${openOverlaps === 1 ? "" : "s"} risk contradictory orders.`,
    });
  }

  if (activeBureaus.length >= 3) {
    score += 10;
    drivers.push({
      label: "Multi-bureau exposure",
      points: 10,
      detail: `Live action in ${activeBureaus.length} bureaus simultaneously.`,
    });
  }

  const criticalCases = activeCases.filter(
    (c) => c.priority === "CRITICAL" || c.priority === "HIGH"
  ).length;
  const priorityPoints = Math.min(15, criticalCases * 5);
  if (priorityPoints > 0) {
    score += priorityPoints;
    drivers.push({
      label: "High-priority allegations",
      points: priorityPoints,
      detail: `${criticalCases} high or critical priority file${criticalCases === 1 ? "" : "s"}.`,
    });
  }

  if (repeatCategories.length > 0) {
    score += 10;
    const top = repeatCategories[0];
    drivers.push({
      label: "Repeat-offender pattern",
      points: 10,
      detail: `${top.count} separate files on “${top.category}”.`,
    });
  }

  if (regulatoryCategories.length > 0) {
    score += 10;
    drivers.push({
      label: "APH regulatory dimension",
      points: 10,
      detail: `Allegations engage ${regulatoryCategories.length} regulatory categor${regulatoryCategories.length === 1 ? "y" : "ies"}.`,
    });
  }

  score = Math.max(0, Math.min(100, score));
  const band = bandFor(score);

  const repeatRegulatory = repeatCategories.some((r) =>
    isRegulatoryCategory(r.category)
  );
  const eoaFlag = score >= 50 || repeatRegulatory || slaBreaches >= 2;
  const evcFlag = regulatoryCategories.length > 0 || openOverlaps > 0;

  const evcScope: string[] = [];
  if (regulatoryCategories.includes("Capitation Fee & Overcharging")) {
    evcScope.push("Audited fee ledgers, trust bank accounts and refund records");
  }
  if (regulatoryCategories.includes("Faculty Non-Payment & Harassment")) {
    evcScope.push("Payroll, 7th CPC arrears, EPF/ESI challans and ICC records");
  }
  if (regulatoryCategories.includes("Unapproved Courses & Seats")) {
    evcScope.push("Approved intake matrix, admission register and counselling allotments");
  }
  if (regulatoryCategories.includes("Ragging & Safety Violations")) {
    evcScope.push("Anti-ragging committee minutes, FIRs and fire-safety certificates");
  }
  if (regulatoryCategories.includes("Withholding Certificates")) {
    evcScope.push("Certificate issue register and pending-document complaints");
  }
  if (evcScope.length === 0) {
    evcScope.push("General APH compliance, mandatory disclosure and grievance records");
  }
  if (activeBureaus.length >= 2) {
    evcScope.push("Joint verification with all bureaus holding parallel files");
  }

  const conditions: string[] = [];
  if (slaBreaches > 0) {
    conditions.push(
      `Dispose of ${slaBreaches} time-barred file${slaBreaches === 1 ? "" : "s"} before the next EoA review.`
    );
  }
  if (openOverlaps > 0) {
    conditions.push(
      "Merge all parallel inquiries into a single master docket and file a joint action report."
    );
  }
  if (repeatCategories.length > 0) {
    conditions.push(
      `Submit a root-cause report for the repeat “${repeatCategories[0].category}” pattern.`
    );
  }
  if (regulatoryCategories.length > 0) {
    conditions.push(
      "Furnish an affidavit from the Chairperson of the Governing Body confirming APH compliance."
    );
  }
  conditions.push(
    "No additional intake or new programme shall be advertised until the compliance report is accepted."
  );

  const showCauseEligible =
    activeCases.some(
      (c) => c.priority === "HIGH" || c.priority === "CRITICAL"
    ) || slaBreaches > 0;

  return {
    institutionId: institution.id,
    institutionName: institution.name,
    aictePermanentId: institution.aicte_permanent_id,
    score,
    band: band.band,
    bandLabel: band.label,
    drivers,
    activeCases: activeCases.length,
    disposedCases,
    slaBreaches,
    openOverlaps,
    activeBureaus,
    repeatCategories,
    eoa: {
      flag: eoaFlag,
      headline: eoaFlag
        ? "Extension of Approval (EoA) scrutiny recommended"
        : "EoA renewal may proceed on the current record",
      recommendation: eoaFlag
        ? "Place the 2026-27 Extension of Approval under scrutiny and require a governing-body compliance affidavit before any intake increase."
        : "No EoA hold is indicated. Continue routine monitoring and close open files within SLA.",
      conditions,
    },
    evc: {
      flag: evcFlag,
      headline: evcFlag
        ? "Expert Visit Committee (EVC) inspection recommended"
        : "No EVC inspection indicated at this stage",
      scope: evcScope,
    },
    showCauseEligible,
    aphClauses: Array.from(
      new Map(
        Array.from(new Set(activeCases.map((c) => c.category))).flatMap((category) =>
          getAphClauses(category).map((clause) => [clause.code, clause] as const)
        )
      ).values()
    ).slice(0, 5),
    regulatoryCategories,
    asOf: new Date().toISOString(),
  };
}

export function showCauseReference(caseCode: string): string {
  const year = new Date().getFullYear();
  const digits = caseCode.replace(/\D/g, "").slice(-5) || "00001";
  return `AICTE/SCN/${year}/${digits}`;
}

export function replyDeadline(days = 15): string {
  const date = new Date(Date.now() + days * 86_400_000);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
