import { SLA_CONFIGS } from "@/lib/demo-data";

export type IngestionChannel =
  | "CPGRAMS"
  | "UGC_ESAMADHAN"
  | "DIRECT_PORTAL"
  | "EMAIL_OCR"
  | "VIGILANCE";

export type RoutedBureau =
  | "REGULATION_BUREAU"
  | "PGRC"
  | "APPROVAL_BUREAU"
  | "SKILL_CELL";

export interface ChannelMeta {
  key: IngestionChannel;
  label: string;
  short: string;
  description: string;
  accent: string;
  border: string;
  source: "student" | "faculty" | "stakeholder" | "public" | "other";
  referencePrefix: string;
}

export const INGESTION_CHANNELS: ChannelMeta[] = [
  {
    key: "CPGRAMS",
    label: "CPGRAMS",
    short: "CP",
    description: "Centralised Public Grievance Redress & Monitoring System",
    accent: "#fbbf24",
    border: "border-amber-400/40",
    source: "public",
    referencePrefix: "CPGRAMS/UP/2026",
  },
  {
    key: "UGC_ESAMADHAN",
    label: "UGC e-Samadhan",
    short: "eS",
    description: "University Grants Commission student grievance bridge",
    accent: "#34d399",
    border: "border-emerald-400/40",
    source: "student",
    referencePrefix: "UGC/eS/2026",
  },
  {
    key: "DIRECT_PORTAL",
    label: "AICTE Portal",
    short: "DP",
    description: "Direct complaint filed on the AICTE grievance portal",
    accent: "#60a5fa",
    border: "border-sky-400/40",
    source: "student",
    referencePrefix: "AICTE/DP/2026",
  },
  {
    key: "EMAIL_OCR",
    label: "Email / OCR",
    short: "EM",
    description: "Scanned representation received at the AICTE grievance mailbox",
    accent: "#a78bfa",
    border: "border-violet-400/40",
    source: "faculty",
    referencePrefix: "AICTE/OCR/2026",
  },
  {
    key: "VIGILANCE",
    label: "Vigilance",
    short: "VG",
    description: "Reference from the Chief Vigilance Officer / CBI liaison desk",
    accent: "#fb7185",
    border: "border-rose-400/40",
    source: "other",
    referencePrefix: "CVO/Ref/2026",
  },
];

export interface CategoryRoute {
  bureau: RoutedBureau;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  regulatory: boolean;
  rationale: string;
}

export const CATEGORY_ROUTES: Record<string, CategoryRoute> = {
  "Ragging & Safety Violations": {
    bureau: "PGRC",
    priority: "CRITICAL",
    regulatory: true,
    rationale:
      "Student safety matters are handled by PGRC under the AICTE Ragging Prevention Regulations with a 7-day statutory clock.",
  },
  "Withholding Certificates": {
    bureau: "PGRC",
    priority: "HIGH",
    regulatory: true,
    rationale:
      "Withholding of original certificates is a student grievance under PGRC; the 15-day timeline applies.",
  },
  "Capitation Fee & Overcharging": {
    bureau: "REGULATION_BUREAU",
    priority: "CRITICAL",
    regulatory: true,
    rationale:
      "Fee violations are regulatory breaches under the AICTE Approval Process Handbook and are investigated by the Regulation Bureau.",
  },
  "Unapproved Courses & Seats": {
    bureau: "APPROVAL_BUREAU",
    priority: "CRITICAL",
    regulatory: true,
    rationale:
      "Unapproved intake directly affects the institution's Extension of Approval and is owned by the Approval Bureau.",
  },
  "Admission Irregularities": {
    bureau: "APPROVAL_BUREAU",
    priority: "HIGH",
    regulatory: true,
    rationale:
      "Admission irregularities are verified against the approved intake matrix by the Approval Bureau.",
  },
  "Faculty Non-Payment & Harassment": {
    bureau: "REGULATION_BUREAU",
    priority: "HIGH",
    regulatory: true,
    rationale:
      "Faculty salary and 7th CPC compliance are inspected by the Regulation Bureau during EVC visits.",
  },
  "Infrastructure & Lab Deficiencies": {
    bureau: "APPROVAL_BUREAU",
    priority: "MEDIUM",
    regulatory: false,
    rationale:
      "Infrastructure shortfalls are assessed against APH facility norms by the Approval Bureau.",
  },
  "Other Institutional Grievances": {
    bureau: "PGRC",
    priority: "MEDIUM",
    regulatory: false,
    rationale:
      "Residual grievances are triaged by PGRC and transferred if a regulatory dimension emerges.",
  },
};

export interface RoutingDecision {
  bureau: RoutedBureau;
  bureauCode: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  slaDays: number;
  warningThreshold: number;
  regulatory: boolean;
  rationale: string[];
  channelLabel: string;
  confidence: "HIGH" | "MEDIUM";
}

const BUREAU_CODE: Record<RoutedBureau, string> = {
  REGULATION_BUREAU: "RB",
  PGRC: "PGRC",
  APPROVAL_BUREAU: "AB",
  SKILL_CELL: "SDC",
};

const PRIORITY_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

function bumpPriority(
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  const index = PRIORITY_ORDER.indexOf(priority);
  return PRIORITY_ORDER[Math.min(PRIORITY_ORDER.length - 1, index + 1)];
}

export function routeComplaint(input: {
  category: string;
  channel: IngestionChannel;
}): RoutingDecision {
  const channel =
    INGESTION_CHANNELS.find((c) => c.key === input.channel) ??
    INGESTION_CHANNELS[0];
  const base =
    CATEGORY_ROUTES[input.category] ??
    CATEGORY_ROUTES["Other Institutional Grievances"];

  let bureau = base.bureau;
  let priority = base.priority;
  const rationale: string[] = [base.rationale];

  if (input.channel === "VIGILANCE") {
    bureau = "REGULATION_BUREAU";
    priority = bumpPriority(priority);
    rationale.push(
      "Vigilance reference automatically escalates one priority level and is copied to the Regulation Bureau."
    );
  } else if (input.channel === "UGC_ESAMADHAN" && bureau !== "APPROVAL_BUREAU") {
    bureau = "PGRC";
    rationale.push(
      "UGC e-Samadhan matters enter the PGRC student-grievance queue and are mirrored to the source portal."
    );
  } else if (input.channel === "CPGRAMS") {
    rationale.push(
      "CPGRAMS reference number is preserved for closure reporting to the Department of Administrative Reforms."
    );
  } else if (input.channel === "EMAIL_OCR") {
    rationale.push(
      "OCR text is indexed for semantic matching; the scanned original is retained as evidence."
    );
  } else {
    rationale.push(
      "Direct portal filing is acknowledged instantly and a case registry number is generated."
    );
  }

  const sla =
    SLA_CONFIGS.find((s) => s.category === input.category) ??
    SLA_CONFIGS[SLA_CONFIGS.length - 1];

  return {
    bureau,
    bureauCode: BUREAU_CODE[bureau],
    priority,
    slaDays: sla.timeline_days,
    warningThreshold: sla.warning_threshold_percent,
    regulatory: base.regulatory,
    rationale,
    channelLabel: channel.label,
    confidence: CATEGORY_ROUTES[input.category] ? "HIGH" : "MEDIUM",
  };
}

const SAMPLES: Record<string, string[]> = {
  "Capitation Fee & Overcharging": [
    "Fourteen final-year B.Tech students have submitted signed affidavits stating that the institute demanded Rs 38,500 as a 'development and lab modernization' fee before releasing hall tickets for the AKTU semester examinations. Receipts were issued by an unrecognised trust account and no fee committee approval was displayed on the notice board.",
    "The parent-teacher association has forwarded bank statements showing capitation payments collected under the head 'special training fund' from 62 first-year students at the time of admission. The amounts exceed the AICTE-prescribed fee by Rs 21,000 per seat and are not reflected in the approved fee structure.",
  ],
  "Withholding Certificates": [
    "Eleven passing-out students have not received their original degree certificates, marksheets and migration certificates despite completing the 2026 convocation formalities. The registrar's office is retaining the documents pending payment of an unspecified 'alumni development charges' of Rs 7,500.",
    "A 2025-batch diploma holder states that the institute is withholding her original certificates because her father refused to sign a no-dues waiver for a hostel mess dispute. She has an offer letter from an IT company and requires the documents for joining.",
  ],
  "Faculty Non-Payment & Harassment": [
    "Twenty-three assistant professors have not been paid salaries for July, August and September 2026. The management has also not deposited EPF and ESI contributions since April. Faculty members allege that 7th CPC arrears have been withheld and that increments were stopped after they raised the issue with the governing body.",
    "A woman assistant professor has reported persistent harassment by the head of department after she objected to being assigned invigilation duties during maternity leave. The internal complaints committee has not met for 45 days and her salary was reduced without a written order.",
  ],
  "Unapproved Courses & Seats": [
    "The institute is advertising admissions for a four-year B.Tech in Artificial Intelligence & Data Science with 180 seats, although the AICTE approved intake letter for 2026-27 sanctions only 60 seats in Computer Science. The prospectus and admission portal both quote the unapproved programme.",
    "A spot inspection found that the polytechnic is running a second shift with 120 additional diploma seats without an approved Extension of Approval. Laboratories and faculty ratios have not been augmented for the extra intake.",
  ],
  "Ragging & Safety Violations": [
    "First-year students have reported a ragging incident in the boys' hostel on 12 October 2026 involving senior students and a late-night initiation ceremony. The anti-ragging committee was informed but no FIR or internal inquiry report has been shared with the students or their parents.",
    "A parent has complained that the institute's transport buses are overcrowded and that a fire safety certificate for the hostel kitchen expired in March 2026. Two students were injured in a stairwell collapse and the warden has not filed an incident report.",
  ],
  "Admission Irregularities": [
    "Management-quota admissions were granted to 28 candidates without valid CET rank cards or qualifying examination marksheets. The admission register shows lump-sum payments collected in cash and seat-blocking letters issued before the counselling rounds.",
    "The institute transferred 40 sanctioned seats from the minority quota to the management quota after the counselling cut-off, and denied admission to eligible SC candidates who had deposited their original documents.",
  ],
  "Infrastructure & Lab Deficiencies": [
    "The civil engineering laboratory has not had a functional universal testing machine for two semesters. Students are being shown video demonstrations instead of conducting the prescribed practicals, and the workshop lacks the safety guards required under the APH facility norms.",
    "The pharmacy programme is running without a validated stability chamber and the instrumentation laboratory has only four working HPLC systems for 120 students. The library subscription to peer-reviewed journals lapsed in June 2026.",
  ],
  "Other Institutional Grievances": [
    "A group of alumni has complained that the institute is refusing to issue transcripts and conduct certificates unless an outstanding hostel dues dispute is resolved, despite a court direction that academic documents must not be withheld.",
    "The institute has not constituted the mandatory Internal Quality Assurance Cell and has not submitted the annual mandatory disclosure for 2026-27. Parents report that fee receipts are not being issued for cash payments.",
  ],
};

export function sampleComplaint(
  category: string,
  channel: IngestionChannel,
  institutionName: string
): string {
  const options = SAMPLES[category] ?? SAMPLES["Other Institutional Grievances"];
  const body = options[channel === "VIGILANCE" ? 1 : 0];
  const channelLine =
    channel === "EMAIL_OCR"
      ? "Scanned representation received at grievance@aicte.gov.in; OCR confidence 96.4%."
      : channel === "VIGILANCE"
        ? "Vigilance reference forwarded by the Chief Vigilance Officer for parallel regulatory examination."
        : `${INGESTION_CHANNELS.find((c) => c.key === channel)?.label ?? "Portal"} submission received by the AICTE grievance desk.`;
  return `${institutionName}: ${body} ${channelLine}`;
}
