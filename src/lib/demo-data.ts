export interface DemoUser {
  id: string;
  name: string;
  email: string;
  password: string; // Plaintext for reference / seed hashing
  password_hash?: string;
  role: "ADMIN" | "COMPETENT_AUTHORITY" | "REGULATION_OFFICER" | "PGRC_OFFICER" | "BUREAU_OFFICER" | "REGIONAL_OFFICER";
  bureau: "REGULATION_BUREAU" | "PGRC" | "APPROVAL_BUREAU" | "SKILL_CELL" | "ALL";
  region?: string;
  designation: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: "usr_admin_001",
    name: "Dr. Rajesh Sharma",
    email: "admin@aicte.gov.in",
    password: "AdminPassword@123",
    role: "ADMIN",
    bureau: "ALL",
    designation: "Chief System Administrator & Director (IT)",
  },
  {
    id: "usr_mgt_002",
    name: "Prof. T. G. Sitharam",
    email: "chairman@aicte.gov.in",
    password: "Chairman@123",
    role: "COMPETENT_AUTHORITY",
    bureau: "ALL",
    designation: "Hon'ble Chairman & Competent Authority, AICTE",
  },
  {
    id: "usr_rb_003",
    name: "Dr. Ramesh Unnikrishnan",
    email: "rb.officer@aicte.gov.in",
    password: "Officer@123",
    role: "REGULATION_OFFICER",
    bureau: "REGULATION_BUREAU",
    designation: "Adviser & Bureau Head (Regulation Bureau)",
  },
  {
    id: "usr_pgrc_004",
    name: "Smt. Sunita Chhibba",
    email: "pgrc.officer@aicte.gov.in",
    password: "Officer@123",
    role: "PGRC_OFFICER",
    bureau: "PGRC",
    designation: "Director & Nodal Officer (Public Grievance Redressal Cell)",
  },
  {
    id: "usr_ab_005",
    name: "Dr. Amit Kumar Srivastava",
    email: "ab.officer@aicte.gov.in",
    password: "Officer@123",
    role: "BUREAU_OFFICER",
    bureau: "APPROVAL_BUREAU",
    designation: "Director (Approval Bureau)",
  },
  {
    id: "usr_ro_006",
    name: "Shri Manoj Kumar",
    email: "ro.north@aicte.gov.in",
    password: "Officer@123",
    role: "REGIONAL_OFFICER",
    bureau: "ALL",
    region: "Northern",
    designation: "Regional Officer (Northern Regional Office - Kanpur)",
  },
];

export const SLA_CONFIGS = [
  { category: "Ragging & Safety Violations", timeline_days: 7, warning_threshold_percent: 75 },
  { category: "Withholding Certificates", timeline_days: 15, warning_threshold_percent: 80 },
  { category: "Capitation Fee & Overcharging", timeline_days: 30, warning_threshold_percent: 80 },
  { category: "Unapproved Courses & Seats", timeline_days: 30, warning_threshold_percent: 80 },
  { category: "Admission Irregularities", timeline_days: 30, warning_threshold_percent: 80 },
  { category: "Faculty Non-Payment & Harassment", timeline_days: 45, warning_threshold_percent: 80 },
  { category: "Infrastructure & Lab Deficiencies", timeline_days: 60, warning_threshold_percent: 80 },
  { category: "Other Institutional Grievances", timeline_days: 45, warning_threshold_percent: 80 },
];

export function normalizeInstitutionName(name: string): string {
  const stopWords = new Set([
    "college", "institute", "of", "technology", "engineering", "and", "the",
    "management", "science", "polytechnic", "pharmacy", "group", "institutions",
    "research", "advanced", "studies", "for", "in"
  ]);

  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopWords.has(word))
    .join(" ")
    .trim();
}
