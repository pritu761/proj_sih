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
  active?: boolean;
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

/**
 * Additional registered officers used by the officer work-queue (acts on cases
 * assigned to them individually) and the admin user-management console.
 */
export const EXTRA_OFFICERS: DemoUser[] = [
  {
    id: "usr_rb_007",
    name: "Smt. Meera Iyer",
    email: "rb.senior@aicte.gov.in",
    password: "Officer@123",
    role: "REGULATION_OFFICER",
    bureau: "REGULATION_BUREAU",
    designation: "Under Secretary (Regulation Bureau)",
  },
  {
    id: "usr_pgrc_008",
    name: "Shri Vikas Nanda",
    email: "pgrc.joint@aicte.gov.in",
    password: "Officer@123",
    role: "PGRC_OFFICER",
    bureau: "PGRC",
    designation: "Joint Director (Public Grievance Redressal Cell)",
  },
  {
    id: "usr_ab_009",
    name: "Dr. Kavita Deshmukh",
    email: "ab.deputy@aicte.gov.in",
    password: "Officer@123",
    role: "BUREAU_OFFICER",
    bureau: "APPROVAL_BUREAU",
    designation: "Deputy Director (Approval Bureau)",
  },
  {
    id: "usr_skill_010",
    name: "Shri Arjun Bhatnagar",
    email: "skill.lead@aicte.gov.in",
    password: "Officer@123",
    role: "BUREAU_OFFICER",
    bureau: "SKILL_CELL",
    designation: "Lead Officer (Skill Development Cell)",
  },
  {
    id: "usr_ro_011",
    name: "Shri P. Ravindran",
    email: "ro.south@aicte.gov.in",
    password: "Officer@123",
    role: "REGIONAL_OFFICER",
    bureau: "ALL",
    region: "Southern",
    designation: "Regional Officer (Southern Regional Office - Chennai)",
  },
  {
    id: "usr_ro_012",
    name: "Smt. Anjali Verma",
    email: "ro.west@aicte.gov.in",
    password: "Officer@123",
    role: "REGIONAL_OFFICER",
    bureau: "ALL",
    region: "Western",
    designation: "Regional Officer (Western Regional Office - Pune)",
  },
];

export const ALL_KNOWN_USERS: DemoUser[] = [...DEMO_USERS, ...EXTRA_OFFICERS];

/**
 * Pre-computed bcrypt hashes (cost 10) for the demo passwords so the offline
 * user store can boot instantly. `bcryptjs` verifies against any valid hash of
 * the same password, so these stay interchangeable with runtime-hashed values.
 */
export const DEMO_PASSWORD_HASHES: Record<string, string> = {
  "AdminPassword@123":
    "$2b$10$8/0XtVJZRKO8BSSnrgYdSeNNguw3chZ6bPA5wzhDoeaBWU1oao27C",
  "Chairman@123": "$2b$10$o5MZQ86jWs4sY5ae8a.nouVBy9/CEDcjQ5mihs.YXVReGnXQ/6EE6",
  "Officer@123": "$2b$10$l6RQtdNUARGs3RNLovXf5uHqpY49EKp6uyqnORCuv4Su/fUGY6p46",
};

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
