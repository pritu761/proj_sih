import { normalizeInstitutionName, SLA_CONFIGS, ALL_KNOWN_USERS } from "./demo-data";
import type { TrilayerBreakdown } from "./services/overlap-detector";

export interface SeedInstitution {
  id: string;
  aicte_permanent_id: string;
  name: string;
  normalized_name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  region: string;
  institution_type: string;
  contact_email: string;
  contact_phone: string;
}

export interface SeedCase {
  id: string;
  case_id: string;
  institution_id: string;
  date_received: Date;
  source: "student" | "faculty" | "stakeholder" | "public" | "other";
  category: string;
  description: string;
  status: "PENDING" | "UNDER_PROCESS" | "DISPOSED" | "TRANSFERRED" | "ESCALATED";
  assigned_bureau: "REGULATION_BUREAU" | "PGRC" | "APPROVAL_BUREAU" | "SKILL_CELL";
  assigned_officer: string;
  last_action: string;
  last_action_date: Date;
  next_action_required: string | null;
  expected_disposal_date: Date;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  complainant_name?: string;
  complainant_contact?: string;
  language?: string;
  hearing_date?: Date | null;
  actions: {
    actor_user: string;
    actor_bureau: string;
    action_type: string;
    remarks: string;
    timestamp: Date;
    attachments: string[];
    from_bureau?: string;
    to_bureau?: string;
  }[];
}

export interface SeedComment {
  id: string;
  case_id: string; // registry number
  author_email: string;
  author_name: string;
  author_bureau: string;
  body: string;
  scope: "COORDINATION" | "INTERNAL";
  created_at: Date;
}

export type SeedDocType =
  | "APPROVAL_LETTER"
  | "COMPLIANCE_REPORT"
  | "AUDIT_STATEMENT"
  | "SHOW_CAUSE_NOTICE"
  | "COURT_ORDER"
  | "FINANCIAL_RECORD"
  | "OTHER";

export interface SeedDocument {
  id: string;
  institution_id: string;
  title: string;
  doc_type: SeedDocType;
  blob_url: string;
  file_name: string;
  file_size: number;
  uploaded_by: string;
  notes?: string;
  case_id?: string;
  uploaded_at: Date;
}

export interface SeedOverlapAlert {
  id: string;
  institution_id: string;
  case_ids: string[];
  bureaus_involved: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  match_reasons: { rule: string; description: string; score?: number; layer?: string }[];
  trilayer?: TrilayerBreakdown;
  detected_at: Date;
  status: "OPEN" | "ACKNOWLEDGED" | "COORDINATED" | "DISMISSED";
  coordination_note: string | null;
  dismissed_reason: string | null;
  master_case_id?: string | null;
  merged_case_ids?: string[];
  merged_at?: Date | null;
  merged_by?: string | null;
}

export function generateSeedData() {
  const institutions: SeedInstitution[] = [];
  const cases: SeedCase[] = [];
  const overlapAlerts: SeedOverlapAlert[] = [];
  const comments: SeedComment[] = [];
  const documents: SeedDocument[] = [];

  // Pre-defined realistic institutions across regions
  const rawInstitutions = [
    // Northern Region
    { name: "Apex Institute of Engineering & Technology", aicte_id: "1-1029384751", city: "Kanpur", state: "Uttar Pradesh", pincode: "208016", region: "Northern", type: "Engineering & Technology" },
    { name: "St. Xavier Institute of Management and Technology", aicte_id: "1-3094857201", city: "Lucknow", state: "Uttar Pradesh", pincode: "226010", region: "Northern", type: "Management" },
    { name: "Harcourt Butler Technical University Affiliate Inst", aicte_id: "1-4920394851", city: "Kanpur", state: "Uttar Pradesh", pincode: "208002", region: "Northern", type: "Engineering & Technology" },
    { name: "Dehradun Institute of Technology Polytechnic", aicte_id: "1-5930294812", city: "Dehradun", state: "Uttarakhand", pincode: "248009", region: "Northern", type: "Polytechnic" },
    { name: "Patna Engineering & Management College", aicte_id: "1-6920491823", city: "Patna", state: "Bihar", pincode: "800013", region: "Northern", type: "Engineering & Technology" },
    { name: "Noida Institute of Pharmaceutical Sciences", aicte_id: "1-7029384711", city: "Noida", state: "Uttar Pradesh", pincode: "201306", region: "Northern", type: "Pharmacy" },
    { name: "Varanasi College of Architecture & Design", aicte_id: "1-8192837465", city: "Varanasi", state: "Uttar Pradesh", pincode: "221005", region: "Northern", type: "Architecture" },
    { name: "Agra Institute of Technology & Management", aicte_id: "1-9283746501", city: "Agra", state: "Uttar Pradesh", pincode: "282007", region: "Northern", type: "Engineering & Technology" },
    { name: "Meerut College of Engineering", aicte_id: "1-1039485722", city: "Meerut", state: "Uttar Pradesh", pincode: "250005", region: "Northern", type: "Engineering & Technology" },
    { name: "Muzaffarpur Institute of Technology & Research", aicte_id: "1-1149203948", city: "Muzaffarpur", state: "Bihar", pincode: "842003", region: "Northern", type: "Engineering & Technology" },
    { name: "Roorkee College of Pharmacy & Allied Sciences", aicte_id: "1-1259302947", city: "Roorkee", state: "Uttarakhand", pincode: "247667", region: "Northern", type: "Pharmacy" },
    { name: "Gorakhpur Polytechnic & Skill Institute", aicte_id: "1-1369204916", city: "Gorakhpur", state: "Uttar Pradesh", pincode: "273008", region: "Northern", type: "Polytechnic" },

    // Western Region
    { name: "Dr. D. Y. Patil College of Pharmacy", aicte_id: "1-2039485712", city: "Pune", state: "Maharashtra", pincode: "411044", region: "Western", type: "Pharmacy" },
    { name: "Maharashtra Institute of Technology & Research", aicte_id: "1-2149586723", city: "Pune", state: "Maharashtra", pincode: "411038", region: "Western", type: "Engineering & Technology" },
    { name: "Sardar Patel College of Engineering and Tech", aicte_id: "1-2259687734", city: "Mumbai", state: "Maharashtra", pincode: "400058", region: "Western", type: "Engineering & Technology" },
    { name: "Ahmedabad Institute of Technology", aicte_id: "1-2369788745", city: "Ahmedabad", state: "Gujarat", pincode: "382481", region: "Western", type: "Engineering & Technology" },
    { name: "Goa College of Pharmacy and Applied Research", aicte_id: "1-2479889756", city: "Panaji", state: "Goa", pincode: "403001", region: "Western", type: "Pharmacy" },
    { name: "Nagpur Institute of Technology", aicte_id: "1-2589990767", city: "Nagpur", state: "Maharashtra", pincode: "441501", region: "Western", type: "Engineering & Technology" },
    { name: "Vadodara Design and Architecture Institute", aicte_id: "1-2690091778", city: "Vadodara", state: "Gujarat", pincode: "390019", region: "Western", type: "Architecture" },
    { name: "Nashik Polytechnic & Vocational Studies", aicte_id: "1-2701192789", city: "Nashik", state: "Maharashtra", pincode: "422005", region: "Western", type: "Polytechnic" },
    { name: "Surat Institute of Management Studies", aicte_id: "1-2812293790", city: "Surat", state: "Gujarat", pincode: "395007", region: "Western", type: "Management" },
    { name: "Aurangabad College of Engineering & Research", aicte_id: "1-2923394801", city: "Chhatrapati Sambhajinagar", state: "Maharashtra", pincode: "431005", region: "Western", type: "Engineering & Technology" },
    { name: "Rajkot Institute of Technology & Polytechnic", aicte_id: "1-3034495812", city: "Rajkot", state: "Gujarat", pincode: "360005", region: "Western", type: "Polytechnic" },
    { name: "Thane College of Management & Technology", aicte_id: "1-3145596823", city: "Thane", state: "Maharashtra", pincode: "400601", region: "Western", type: "Management" },

    // Southern Region
    { name: "Sri Venkateswara College of Engineering & Technology", aicte_id: "1-4019283741", city: "Chittoor", state: "Andhra Pradesh", pincode: "517127", region: "Southern", type: "Engineering & Technology" },
    { name: "Vellore Institute of Advance Technology", aicte_id: "1-4129384752", city: "Vellore", state: "Tamil Nadu", pincode: "632014", region: "Southern", type: "Engineering & Technology" },
    { name: "Coimbatore Institute of Engineering & Technology", aicte_id: "1-4239485763", city: "Coimbatore", state: "Tamil Nadu", pincode: "641109", region: "Southern", type: "Engineering & Technology" },
    { name: "Hyderabad Business School & Technology", aicte_id: "1-4349586774", city: "Hyderabad", state: "Telangana", pincode: "500032", region: "Southern", type: "Management" },
    { name: "Kochi College of Architecture and Urban Design", aicte_id: "1-4459687785", city: "Kochi", state: "Kerala", pincode: "682024", region: "Southern", type: "Architecture" },
    { name: "Tirupati College of Pharmacy & Research", aicte_id: "1-4569788796", city: "Tirupati", state: "Andhra Pradesh", pincode: "517507", region: "Southern", type: "Pharmacy" },
    { name: "Madurai Polytechnic Institute", aicte_id: "1-4679889707", city: "Madurai", state: "Tamil Nadu", pincode: "625011", region: "Southern", type: "Polytechnic" },
    { name: "Thiruvananthapuram Engineering College", aicte_id: "1-4789990718", city: "Thiruvananthapuram", state: "Kerala", pincode: "695016", region: "Southern", type: "Engineering & Technology" },
    { name: "Warangal Institute of Science & Technology", aicte_id: "1-4890091729", city: "Warangal", state: "Telangana", pincode: "506004", region: "Southern", type: "Engineering & Technology" },
    { name: "Visakhapatnam Marine & Engineering Institute", aicte_id: "1-4901192730", city: "Visakhapatnam", state: "Andhra Pradesh", pincode: "530003", region: "Southern", type: "Engineering & Technology" },
    { name: "Chennai City College of Management", aicte_id: "1-5012293741", city: "Chennai", state: "Tamil Nadu", pincode: "600028", region: "Southern", type: "Management" },
    { name: "Kozhikode Institute of Technology & Research", aicte_id: "1-5123394752", city: "Kozhikode", state: "Kerala", pincode: "673005", region: "Southern", type: "Engineering & Technology" },

    // Eastern Region
    { name: "National Institute of Science & Technology", aicte_id: "1-6019283711", city: "Berhampur", state: "Odisha", pincode: "761008", region: "Eastern", type: "Engineering & Technology" },
    { name: "Kalinga Institute of Industrial Technology Polytechnic", aicte_id: "1-6129384722", city: "Bhubaneswar", state: "Odisha", pincode: "751024", region: "Eastern", type: "Polytechnic" },
    { name: "Kolkata Institute of Engineering and Management", aicte_id: "1-6239485733", city: "Kolkata", state: "West Bengal", pincode: "700091", region: "Eastern", type: "Engineering & Technology" },
    { name: "Ranchi College of Pharmacy & Allied Health", aicte_id: "1-6349586744", city: "Ranchi", state: "Jharkhand", pincode: "834001", region: "Eastern", type: "Pharmacy" },
    { name: "Guwahati Institute of Technology & Skills", aicte_id: "1-6459687755", city: "Guwahati", state: "Assam", pincode: "781035", region: "Eastern", type: "Engineering & Technology" },
    { name: "Siliguri College of Management & Technology", aicte_id: "1-6569788766", city: "Siliguri", state: "West Bengal", pincode: "734001", region: "Eastern", type: "Management" },
    { name: "Jamshedpur Technical Institute", aicte_id: "1-6679889777", city: "Jamshedpur", state: "Jharkhand", pincode: "831014", region: "Eastern", type: "Engineering & Technology" },
    { name: "Cuttack Polytechnic College", aicte_id: "1-6789990788", city: "Cuttack", state: "Odisha", pincode: "753001", region: "Eastern", type: "Polytechnic" },
    { name: "Durgapur Engineering Institute", aicte_id: "1-6890091799", city: "Durgapur", state: "West Bengal", pincode: "713212", region: "Eastern", type: "Engineering & Technology" },
    { name: "Dhanbad College of Technology & Mining Studies", aicte_id: "1-6901192800", city: "Dhanbad", state: "Jharkhand", pincode: "826004", region: "Eastern", type: "Engineering & Technology" },
    { name: "Shillong Institute of Advanced Studies", aicte_id: "1-7012293811", city: "Shillong", state: "Meghalaya", pincode: "793001", region: "Eastern", type: "Management" },
    { name: "Rourkela Institute of Technology & Science", aicte_id: "1-7123394822", city: "Rourkela", state: "Odisha", pincode: "769004", region: "Eastern", type: "Engineering & Technology" },

    // Central / South-Western / North-Western Regions
    { name: "Maharaja Agrasen Institute of Technology", aicte_id: "1-8019283711", city: "Delhi", state: "Delhi", pincode: "110086", region: "North-Western", type: "Engineering & Technology" },
    { name: "BMS College of Engineering", aicte_id: "1-8129384722", city: "Bengaluru", state: "Karnataka", pincode: "560019", region: "South-Western", type: "Engineering & Technology" },
    { name: "Indore Institute of Science & Technology", aicte_id: "1-8239485733", city: "Indore", state: "Madhya Pradesh", pincode: "453331", region: "Central", type: "Engineering & Technology" },
    { name: "Jaipur Engineering College and Research Centre", aicte_id: "1-8349586744", city: "Jaipur", state: "Rajasthan", pincode: "302022", region: "North-Western", type: "Engineering & Technology" },
    { name: "Bhopal Institute of Technology & Science", aicte_id: "1-8459687755", city: "Bhopal", state: "Madhya Pradesh", pincode: "462045", region: "Central", type: "Engineering & Technology" },
    { name: "Chandigarh Group of Colleges Technical Campus", aicte_id: "1-8569788766", city: "Mohali", state: "Punjab", pincode: "140307", region: "North-Western", type: "Engineering & Technology" },
    { name: "Gurugram Institute of Technology & Management", aicte_id: "1-8679889777", city: "Gurugram", state: "Haryana", pincode: "122001", region: "North-Western", type: "Management" },
    { name: "Mysuru College of Engineering and Architecture", aicte_id: "1-8789990788", city: "Mysuru", state: "Karnataka", pincode: "570008", region: "South-Western", type: "Architecture" },
    { name: "Gwalior Institute of Pharmaceutical Sciences", aicte_id: "1-8890091799", city: "Gwalior", state: "Madhya Pradesh", pincode: "474005", region: "Central", type: "Pharmacy" },
    { name: "Jodhpur Technical Polytechnic", aicte_id: "1-8901192800", city: "Jodhpur", state: "Rajasthan", pincode: "342001", region: "North-Western", type: "Polytechnic" },
    { name: "Mangaluru Institute of Marine & Tech Studies", aicte_id: "1-9012293811", city: "Mangaluru", state: "Karnataka", pincode: "575001", region: "South-Western", type: "Engineering & Technology" },
    { name: "Jabalpur College of Engineering & Research", aicte_id: "1-9123394822", city: "Jabalpur", state: "Madhya Pradesh", pincode: "482001", region: "Central", type: "Engineering & Technology" },

    // ── Extended registry (indices 61+): broader regional coverage so the
    //    bureaus, overlap detector and AI briefs work on a realistic volume ──
    // Northern
    { name: "Prayagraj Institute of Engineering & Management", aicte_id: "1-9224494933", city: "Prayagraj", state: "Uttar Pradesh", pincode: "211016", region: "Northern", type: "Engineering & Technology" },
    { name: "Bareilly College of Pharmacy & Research", aicte_id: "1-9325595044", city: "Bareilly", state: "Uttar Pradesh", pincode: "243005", region: "Northern", type: "Pharmacy" },
    { name: "Jhansi Institute of Technology & Polytechnic", aicte_id: "1-9426695155", city: "Jhansi", state: "Uttar Pradesh", pincode: "284128", region: "Northern", type: "Polytechnic" },
    { name: "Gaya College of Engineering & Skills", aicte_id: "1-9527795266", city: "Gaya", state: "Bihar", pincode: "823003", region: "Northern", type: "Engineering & Technology" },
    { name: "Darbhanga Institute of Management Studies", aicte_id: "1-9628895377", city: "Darbhanga", state: "Bihar", pincode: "846004", region: "Northern", type: "Management" },
    { name: "Haridwar Institute of Technology & Sciences", aicte_id: "1-9729995488", city: "Haridwar", state: "Uttarakhand", pincode: "249403", region: "Northern", type: "Engineering & Technology" },
    // Western
    { name: "Kolhapur Institute of Engineering & Technology", aicte_id: "1-9830095599", city: "Kolhapur", state: "Maharashtra", pincode: "416004", region: "Western", type: "Engineering & Technology" },
    { name: "Solapur College of Pharmacy", aicte_id: "1-9931195600", city: "Solapur", state: "Maharashtra", pincode: "413004", region: "Western", type: "Pharmacy" },
    { name: "Amravati Institute of Technology & Management", aicte_id: "1-1032209611", city: "Amravati", state: "Maharashtra", pincode: "444602", region: "Western", type: "Management" },
    { name: "Bhavnagar Engineering & Polytechnic Institute", aicte_id: "1-1042309722", city: "Bhavnagar", state: "Gujarat", pincode: "364002", region: "Western", type: "Polytechnic" },
    { name: "Gandhinagar Institute of Technology & Design", aicte_id: "1-1052409833", city: "Gandhinagar", state: "Gujarat", pincode: "382421", region: "Western", type: "Architecture" },
    { name: "Vasai Institute of Management & Research", aicte_id: "1-1062509944", city: "Vasai-Virar", state: "Maharashtra", pincode: "401202", region: "Western", type: "Management" },
    // Southern
    { name: "Salem College of Engineering & Technology", aicte_id: "1-1072600055", city: "Salem", state: "Tamil Nadu", pincode: "636008", region: "Southern", type: "Engineering & Technology" },
    { name: "Tiruchirappalli Institute of Technology & Science", aicte_id: "1-1082700166", city: "Tiruchirappalli", state: "Tamil Nadu", pincode: "620017", region: "Southern", type: "Engineering & Technology" },
    { name: "Vijayawada Institute of Engineering & Pharmacy", aicte_id: "1-1092800277", city: "Vijayawada", state: "Andhra Pradesh", pincode: "520008", region: "Southern", type: "Pharmacy" },
    { name: "Thrissur College of Architecture & Planning", aicte_id: "1-1102900388", city: "Thrissur", state: "Kerala", pincode: "680004", region: "Southern", type: "Architecture" },
    { name: "Kannur Institute of Technology & Management", aicte_id: "1-1113000499", city: "Kannur", state: "Kerala", pincode: "670001", region: "Southern", type: "Management" },
    { name: "Nellore Polytechnic & Skill Institute", aicte_id: "1-1123100500", city: "Nellore", state: "Andhra Pradesh", pincode: "524001", region: "Southern", type: "Polytechnic" },
    // Eastern
    { name: "Asansol Institute of Technology & Mining Studies", aicte_id: "1-1133200611", city: "Asansol", state: "West Bengal", pincode: "713305", region: "Eastern", type: "Engineering & Technology" },
    { name: "Sambalpur College of Engineering & Technology", aicte_id: "1-1143300722", city: "Sambalpur", state: "Odisha", pincode: "768004", region: "Eastern", type: "Engineering & Technology" },
    { name: "Silchar Institute of Management & Technology", aicte_id: "1-1153400833", city: "Silchar", state: "Assam", pincode: "788005", region: "Eastern", type: "Management" },
    { name: "Dibrugarh Polytechnic & Engineering Institute", aicte_id: "1-1163500944", city: "Dibrugarh", state: "Assam", pincode: "786003", region: "Eastern", type: "Polytechnic" },
    { name: "Agartala College of Pharmacy & Health Sciences", aicte_id: "1-1173601055", city: "Agartala", state: "Tripura", pincode: "799004", region: "Eastern", type: "Pharmacy" },
    { name: "Hazaribagh Institute of Technology", aicte_id: "1-1183701166", city: "Hazaribagh", state: "Jharkhand", pincode: "825301", region: "Eastern", type: "Engineering & Technology" },
    // Central
    { name: "Raipur Institute of Technology & Sciences", aicte_id: "1-1193801277", city: "Raipur", state: "Chhattisgarh", pincode: "492010", region: "Central", type: "Engineering & Technology" },
    { name: "Bilaspur College of Pharmacy & Research", aicte_id: "1-1203901388", city: "Bilaspur", state: "Chhattisgarh", pincode: "495001", region: "Central", type: "Pharmacy" },
    { name: "Ujjain Institute of Engineering & Management", aicte_id: "1-1214001499", city: "Ujjain", state: "Madhya Pradesh", pincode: "456010", region: "Central", type: "Management" },
    { name: "Rewa Engineering & Polytechnic College", aicte_id: "1-1224101500", city: "Rewa", state: "Madhya Pradesh", pincode: "486001", region: "Central", type: "Polytechnic" },
    { name: "Satna Institute of Technology & Skills", aicte_id: "1-1234201611", city: "Satna", state: "Madhya Pradesh", pincode: "485001", region: "Central", type: "Engineering & Technology" },
    { name: "Bhilai Institute of Technology & Research", aicte_id: "1-1244301722", city: "Bhilai", state: "Chhattisgarh", pincode: "490006", region: "Central", type: "Engineering & Technology" },
    // North-Western
    { name: "Ludhiana College of Engineering & Technology", aicte_id: "1-1254401833", city: "Ludhiana", state: "Punjab", pincode: "141004", region: "North-Western", type: "Engineering & Technology" },
    { name: "Patiala Institute of Pharmacy & Sciences", aicte_id: "1-1264501944", city: "Patiala", state: "Punjab", pincode: "147002", region: "North-Western", type: "Pharmacy" },
    { name: "Hisar Institute of Technology & Management", aicte_id: "1-1274602055", city: "Hisar", state: "Haryana", pincode: "125001", region: "North-Western", type: "Management" },
    { name: "Kota Institute of Engineering & Polytechnic", aicte_id: "1-1284702166", city: "Kota", state: "Rajasthan", pincode: "324005", region: "North-Western", type: "Polytechnic" },
    { name: "Udaipur College of Architecture & Design", aicte_id: "1-1294802277", city: "Udaipur", state: "Rajasthan", pincode: "313002", region: "North-Western", type: "Architecture" },
    { name: "Karnal Institute of Technology & Skills", aicte_id: "1-1304902388", city: "Karnal", state: "Haryana", pincode: "132001", region: "North-Western", type: "Engineering & Technology" },
    // South-Western
    { name: "Hubballi Institute of Technology & Management", aicte_id: "1-1315002499", city: "Hubballi", state: "Karnataka", pincode: "580021", region: "South-Western", type: "Engineering & Technology" },
    { name: "Belagavi College of Engineering & Pharmacy", aicte_id: "1-1325102500", city: "Belagavi", state: "Karnataka", pincode: "590008", region: "South-Western", type: "Pharmacy" },
    { name: "Shivamogga Institute of Technology & Sciences", aicte_id: "1-1335202611", city: "Shivamogga", state: "Karnataka", pincode: "577202", region: "South-Western", type: "Engineering & Technology" },
    { name: "Davanagere Polytechnic & Skill Institute", aicte_id: "1-1345302722", city: "Davanagere", state: "Karnataka", pincode: "577004", region: "South-Western", type: "Polytechnic" },
    { name: "Tumakuru College of Engineering & Technology", aicte_id: "1-1355402833", city: "Tumakuru", state: "Karnataka", pincode: "572103", region: "South-Western", type: "Engineering & Technology" },
    { name: "Hassan Institute of Management & Technology", aicte_id: "1-1365502944", city: "Hassan", state: "Karnataka", pincode: "573201", region: "South-Western", type: "Management" },
  ];

  // Build institutions array with normalized names
  rawInstitutions.forEach((raw, idx) => {
    institutions.push({
      id: `inst_${idx + 1}`,
      aicte_permanent_id: raw.aicte_id,
      name: raw.name,
      normalized_name: normalizeInstitutionName(raw.name),
      address: `Campus Plot ${10 + idx}, Knowledge Corridor, Sector ${1 + (idx % 12)}`,
      city: raw.city,
      state: raw.state,
      pincode: raw.pincode,
      region: raw.region,
      institution_type: raw.type,
      contact_email: `principal@${raw.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15)}.ac.in`,
      contact_phone: `+91 ${9810000000 + idx * 1111}`,
    });
  });

  const categories = SLA_CONFIGS.map(c => c.category);
  const bureaus: ("REGULATION_BUREAU" | "PGRC" | "APPROVAL_BUREAU" | "SKILL_CELL")[] = [
    "REGULATION_BUREAU", "PGRC", "APPROVAL_BUREAU", "SKILL_CELL"
  ];
  const sources: ("student" | "faculty" | "stakeholder" | "public" | "other")[] = [
    "student", "faculty", "stakeholder", "public", "other"
  ];

  // Reference clock: seed-run time. All generated history sits in the past
  // relative to this moment, so every re-seed produces a fresh, coherent
  // demo timeline (hearings ahead, SLA breaches live, disposals closed).
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
  const daysAhead = (n: number) => new Date(now.getTime() + n * 86400000);

  // 1. SPECIFIC OVERLAP SCENARIO 1 (from problem statement):
  // Apex Institute of Engineering & Technology (inst_1)
  // PGRC: Case Under Process (Capitation Fee)
  // RB: Case Pending / Action Initiated (Capitation Fee)
  const case1_pgrc: SeedCase = {
    id: "case_00101",
    case_id: "AICTE/PGRC/2026/00101",
    institution_id: "inst_1",
    date_received: daysAgo(38), // statutory clock already exhausted
    source: "student",
    category: "Capitation Fee & Overcharging",
    description: "Final year B.Tech students allege the institute is demanding an unauthorized development and lab fee of Rs 45,000 per student prior to issuing hall tickets for university semester examinations.",
    status: "UNDER_PROCESS",
    assigned_bureau: "PGRC",
    assigned_officer: "pgrc.officer@aicte.gov.in",
    last_action: "Show Cause Notice dispatched to Principal via portal",
    last_action_date: daysAgo(16),
    next_action_required: "Hearing before Standing Grievance Committee",
    expected_disposal_date: daysAgo(8), // SLA breached!
    priority: "HIGH",
    complainant_name: "Rohit Sharma (Student Union President)",
    complainant_contact: "+91 9811712233",
    hearing_date: daysAhead(6),
    actions: [
      {
        actor_user: "pgrc.officer@aicte.gov.in",
        actor_bureau: "PGRC",
        action_type: "RECEIVED",
        remarks: "Grievance received from Student Union with signed representation of 42 students.",
        timestamp: daysAgo(38),
        attachments: ["https://blob.vercel-storage.com/complaints/student_petition_apex.pdf"],
      },
      {
        actor_user: "pgrc.officer@aicte.gov.in",
        actor_bureau: "PGRC",
        action_type: "ASSIGNED",
        remarks: "Assigned to Assistant Director PGRC for verification.",
        timestamp: daysAgo(36),
        attachments: [],
      },
      {
        actor_user: "pgrc.officer@aicte.gov.in",
        actor_bureau: "PGRC",
        action_type: "STATUS_CHANGED",
        remarks: "Show Cause Notice issued under AICTE (Establishment of Mechanism for Grievance Redressal) Regulations. Institution response awaited.",
        timestamp: daysAgo(16),
        attachments: ["https://blob.vercel-storage.com/notices/SCN_PGRC_2026_101.pdf"],
      },
    ],
  };

  const case2_rb: SeedCase = {
    id: "case_00042",
    case_id: "AICTE/RB/2026/00042",
    institution_id: "inst_1",
    date_received: daysAgo(24), // statutory window approaching
    source: "faculty",
    category: "Capitation Fee & Overcharging",
    description: "Faculty members submitted internal accounts showing capitation fees collected under the head of special training and building fund, violating AICTE fee regulations.",
    status: "PENDING",
    assigned_bureau: "REGULATION_BUREAU",
    assigned_officer: "rb.officer@aicte.gov.in",
    last_action: "Action Initiated",
    last_action_date: daysAgo(21),
    next_action_required: "Expert Visit Committee (EVC) Inspection appointment",
    expected_disposal_date: daysAhead(6),
    priority: "CRITICAL",
    complainant_name: "Rohit Sharma (Student Union President)",
    complainant_contact: "+91 9811712233",
    actions: [
      {
        actor_user: "rb.officer@aicte.gov.in",
        actor_bureau: "REGULATION_BUREAU",
        action_type: "RECEIVED",
        remarks: "Complaint received regarding systematic capitation fee collection.",
        timestamp: daysAgo(24),
        attachments: ["https://blob.vercel-storage.com/evidence/audited_statements_apex.pdf"],
      },
      {
        actor_user: "rb.officer@aicte.gov.in",
        actor_bureau: "REGULATION_BUREAU",
        action_type: "STATUS_CHANGED",
        remarks: "Action Initiated. File moved to Standing Hearing Committee (SHC) for surprise inspection.",
        timestamp: daysAgo(21),
        attachments: [],
      },
    ],
  };

  cases.push(case1_pgrc, case2_rb);

  overlapAlerts.push({
    id: "ovl_001",
    institution_id: "inst_1",
    case_ids: ["AICTE/PGRC/2026/00101", "AICTE/RB/2026/00042"],
    bureaus_involved: ["PGRC", "REGULATION_BUREAU"],
    confidence: "HIGH",
    match_reasons: [
      { rule: "EXACT_PERMANENT_ID", description: "Identical AICTE Permanent ID: 1-1029384751 active in PGRC and Regulation Bureau simultaneously." },
      { rule: "CATEGORY_MATCH", description: "Same category: 'Capitation Fee & Overcharging' reported by both student body and faculty members." },
      { rule: "CONFIDENCE_SCORE", description: "High risk of duplicate inquiry / contradictory orders to institution.", score: 98 },
    ],
    detected_at: daysAgo(21),
    status: "OPEN",
    coordination_note: null,
    dismissed_reason: null,
  });

  // Additional 9 deliberate overlap institutions
  const deliberateOverlapInstIndexes = [2, 13, 25, 26, 37, 38, 49, 50, 51]; // indices corresponding to raw institutions
  deliberateOverlapInstIndexes.forEach((instIdx, oIdx) => {
    const inst = institutions[instIdx - 1] || institutions[0];
    const cId1 = `AICTE/RB/2026/${String(200 + oIdx * 10).padStart(5, "0")}`;
    const cId2 = `AICTE/PGRC/2026/${String(201 + oIdx * 10).padStart(5, "0")}`;
    const date1 = new Date(now.getTime() - (15 + oIdx * 3) * 86400000);
    const date2 = new Date(now.getTime() - (8 + oIdx * 2) * 86400000);

    const c1: SeedCase = {
      id: `case_ovl_a_${oIdx}`,
      case_id: cId1,
      institution_id: inst.id,
      date_received: date1,
      source: "faculty",
      category: categories[oIdx % categories.length],
      description: `Regulatory compliance audit initiated regarding ${categories[oIdx % categories.length]} at ${inst.name}.`,
      status: oIdx % 2 === 0 ? "UNDER_PROCESS" : "PENDING",
      assigned_bureau: "REGULATION_BUREAU",
      assigned_officer: "rb.officer@aicte.gov.in",
      last_action: "Explanations called from Governing Body",
      last_action_date: new Date(date1.getTime() + 2 * 86400000),
      next_action_required: "Review response at SHC",
      expected_disposal_date: new Date(date1.getTime() + 30 * 86400000),
      priority: oIdx === 0 ? "CRITICAL" : "HIGH",
      actions: [
        {
          actor_user: "rb.officer@aicte.gov.in",
          actor_bureau: "REGULATION_BUREAU",
          action_type: "RECEIVED",
          remarks: "Matter taken up suo-motu / based on regional office input.",
          timestamp: date1,
          attachments: [],
        },
      ],
    };

    const c2: SeedCase = {
      id: `case_ovl_b_${oIdx}`,
      case_id: cId2,
      institution_id: inst.id,
      date_received: date2,
      source: "student",
      category: categories[oIdx % categories.length],
      description: `Student petition alleging severe irregularities and non-redressal regarding ${categories[oIdx % categories.length]}.`,
      status: "UNDER_PROCESS",
      assigned_bureau: "PGRC",
      assigned_officer: "pgrc.officer@aicte.gov.in",
      last_action: "Matter placed before Ombudsman",
      last_action_date: new Date(date2.getTime() + 3 * 86400000),
      next_action_required: "Joint inspection report awaited",
      expected_disposal_date: new Date(date2.getTime() + 25 * 86400000),
      priority: "HIGH",
      actions: [
        {
          actor_user: "pgrc.officer@aicte.gov.in",
          actor_bureau: "PGRC",
          action_type: "RECEIVED",
          remarks: "Grievance registered on central portal.",
          timestamp: date2,
          attachments: [],
        },
      ],
    };

    cases.push(c1, c2);

    const isFuzzyNameScenario = oIdx === 1 || oIdx === 7;

    overlapAlerts.push({
      id: `ovl_00${oIdx + 2}`,
      institution_id: inst.id,
      case_ids: [cId1, cId2],
      bureaus_involved: ["REGULATION_BUREAU", "PGRC"],
      confidence: isFuzzyNameScenario ? "MEDIUM" : "HIGH",
      match_reasons: [
        isFuzzyNameScenario
          ? { rule: "FUZZY_NAME_AND_LOCATION", description: `Institution name variant similarity (91%) matches pincode ${inst.pincode} and city ${inst.city}.`, score: 91 }
          : { rule: "EXACT_PERMANENT_ID", description: `Same AICTE Permanent ID: ${inst.aicte_permanent_id} with parallel active files in 2 Bureaus.` },
        { rule: "CATEGORY_OVERLAP", description: `Both cases address ${categories[oIdx % categories.length]}.` },
      ],
      detected_at: date2,
      status: oIdx === 2 ? "COORDINATED" : oIdx === 3 ? "ACKNOWLEDGED" : "OPEN",
      coordination_note: oIdx === 2 ? "PGRC and Regulation Bureau held joint hearing on 2026-10-18. Case merged under RB lead." : null,
      dismissed_reason: null,
    });
  });

  // Now populate remainder of the ~300 cases across all institutions to satisfy realistic workload
  const officers = [
    { email: "rb.officer@aicte.gov.in", bureau: "REGULATION_BUREAU" },
    { email: "pgrc.officer@aicte.gov.in", bureau: "PGRC" },
    { email: "ab.officer@aicte.gov.in", bureau: "APPROVAL_BUREAU" },
    { email: "skill.officer@aicte.gov.in", bureau: "SKILL_CELL" },
  ];

  const statuses: ("PENDING" | "UNDER_PROCESS" | "DISPOSED" | "TRANSFERRED" | "ESCALATED")[] = [
    "PENDING", "UNDER_PROCESS", "UNDER_PROCESS", "DISPOSED", "DISPOSED", "TRANSFERRED", "ESCALATED"
  ];

  // Deterministic complainant pool. Most grievances come from ordinary
  // single-filing complainants; a fixed minority of identities file repeatedly
  // across institutions and Bureaus so the recurrence engine has real signal.
  const REPEAT_COMPLAINANTS = [
    { name: "Devika Menon", contact: "+91 9447033055" },
    { name: "Hiteshbhai Patel", contact: "+91 9825004412" },
    { name: "Sanjana Das", contact: "+91 9830011788" },
    { name: "Farhan Qureshi", contact: "+91 9900041145" },
  ];
  const UNIQUE_FIRST = ["Neha", "Arun", "Priyanka", "Kabir", "Lakshmi", "Imran", "Meera", "Sanjay", "Anita", "Vikram", "Deepa", "Rakesh", "Farah", "Naveen", "Swati", "Joseph", "Bindiya", "Tarun", "Shreya", "Mohan"];
  const UNIQUE_LAST = ["Gupta", "Nair", "Kulkarni", "Reddy", "Chatterjee", "Saini", "Pillai", "Khan", "Joshi", "Rao"];

  let currentCaseNum = 1000;
  let commentSeq = 0;
  let documentSeq = 0;

  // Officers the enriched store attributes actions and comments to (mirrors
  // the demo officer roster in demo-data so identities stay coherent).
  const OFFICER_POOL = ALL_KNOWN_USERS
    .filter((u) => u.bureau !== "ALL")
    .map((u) => ({ email: u.email, name: u.name, bureau: u.bureau as string }));

  // Category-specific grievance narratives — the AI intake layer needs real
  // textual signal, not placeholder sentences, to classify and summarize.
  const DESCRIPTIONS: Record<string, [string, string]> = {
    "Ragging & Safety Violations": [
      "A first-year hostel resident reported repeated ragging incidents in Block C during orientation week. The anti-ragging committee of {inst} has not convened a single sitting this semester despite written complaints to the warden.",
      "Parents of a first-year diploma student at {inst} allege physical ragging and intimidation by senior students near the hostel mess on three separate dates. CCTV footage for those dates is being withheld by the institution.",
    ],
    "Withholding Certificates": [
      "{inst} is withholding the original TC, mark sheets and migration certificate of passed-out students until a pending fee dispute is settled, despite a written undertaking already furnished. Placement offers of affected students are on hold.",
      "Students of {inst} report that original documents deposited at admission are not returned after course completion; the office demands an undocumented clearing amount of Rs 5,000 per certificate set.",
    ],
    "Capitation Fee & Overcharging": [
      "{inst} is demanding Rs 42,000 per student as a one-time development fee before hall tickets are issued, over and above the state fee-committee-approved structure. Receipts are being issued in the name of an unregistered trust.",
      "An internal accounts extract from {inst} shows capitation collected under the heads of training fund and building corpus from the 2026 admission batch, exceeding the sanctioned fee structure by nearly 31%.",
    ],
    "Unapproved Courses & Seats": [
      "{inst} is running a B.Tech (AI & Data Science) programme and admitting 60 seats without AICTE extension of approval for the current academic year; the affiliation status of the course is not disclosed to admitted students.",
      "The prospectus of {inst} lists an MBA (Business Analytics) intake of 120 seats against an approved intake of 60, with excess admissions routed through a partner training institute.",
    ],
    "Admission Irregularities": [
      "Counselling records indicate {inst} admitted candidates below the notified cutoff in the management quota without publishing the seat matrix, and the vacant-seat disclosure on the portal was never updated.",
      "{inst} collected spot-admission fees in cash for diploma lateral-entry seats before the state counselling round concluded, bypassing the centralized admission procedure entirely.",
    ],
    "Faculty Non-Payment & Harassment": [
      "Eight assistant professors at {inst} have not received salaries for the last four months; the institution cites an internal audit as the reason, while senior management continues to draw full pay.",
      "A faculty member at {inst} reports termination without notice after raising laboratory safety deficiencies in writing, with terminal dues withheld for over two months.",
    ],
    "Infrastructure & Lab Deficiencies": [
      "A laboratory inspection at {inst} found the workshop, physics lab and computer centre non-operational; equipment listed in the approval letter is either absent or non-functional, affecting 640 students.",
      "The library and workshop at {inst} remain uncommissioned two years after the building was shown as ready in compliance filings, and the hostel water supply fails daily.",
    ],
    "Other Institutional Grievances": [
      "{inst} has failed to constitute the statutory grievance redressal committee and the SC/ST cell as required under AICTE regulations; written reminders from the student council have gone unanswered.",
      "Alumni of {inst} report ambiguous refund commitments for withdrawn admissions, and the ombudsman appointment notification was never published on the institute website.",
    ],
  };

  const RECEIVED_REMARKS = [
    "Grievance received on the central portal ({source} channel) and cataloged under standard SOP.",
    "Representation received by post ({source}); registered in the regional intake register.",
    "Complaint forwarded by the Regional Office ({source} origin); fresh registry number allotted.",
    "Grievance e-mailed to the bureau desk ({source}); contact details verified and cataloged.",
  ];
  const INTERIM_REMARKS = [
    "Institution response called for within 7 working days under the grievance redressal regulations.",
    "Compliance verification visit planned; regional office informed of the inspection window.",
    "Interim compliance report received; discrepancies noted and clarification sought from the Principal.",
    "Record verification in progress against the approval-letter conditions for AY 2026-27.",
  ];
  const DISPOSED_REMARKS = [
    "Matter thoroughly investigated and closed with a reasoned speaking order; directions issued to the institution.",
    "Institution complied with the committee directions; disposal order uploaded to the portal with compliance annexures.",
    "Resolved on merits after hearing both sides; compliance certificate placed on record.",
  ];
  const ESCALATED_REMARKS = [
    "SLA threshold exceeded; file submitted to the Competent Authority for urgent direction.",
    "Statutory window exhausted without compliance; escalated to the Member Secretary's office.",
  ];

  const COMMENT_BODIES: { scope: "COORDINATION" | "INTERNAL"; body: string }[] = [
    { scope: "COORDINATION", body: "Regional office inputs received on this file; sharing for cross-bureau visibility so notices to the institution stay consistent." },
    { scope: "INTERNAL", body: "Desk note: institution response verified against the approval-letter conditions; escalation draft prepared for the bureau head." },
    { scope: "COORDINATION", body: "Requesting the assigned bureau to confirm the hearing date so the complainant side can be intimated jointly." },
    { scope: "INTERNAL", body: "Compliance annexures scanned and linked to the file; one annexure is illegible — re-submission called for." },
    { scope: "COORDINATION", body: "Parallel-proceedings check completed — no other open file found for this institution this quarter." },
    { scope: "INTERNAL", body: "Hearing panel composition proposed; awaiting the director's approval before intimation goes out." },
  ];

  const bump = (n: number) => Math.max(1, n);

  institutions.forEach((inst, iIdx) => {
    // Enriched volume: 9-12 cases per institution (~1,040 files) so the
    // bureaus, regional offices and AI surfaces work on a realistic load.
    const casesForThisInst = (iIdx % 3 === 0 ? 12 : 9);
    for (let k = 0; k < casesForThisInst; k++) {
      currentCaseNum++;
      const assigned = officers[(iIdx + k) % officers.length];
      const category = categories[(iIdx * 2 + k) % categories.length];
      const status = statuses[(currentCaseNum + k) % statuses.length];
      const source = sources[(currentCaseNum + iIdx) % sources.length];
      // Keep every generated action in the past relative to the seed clock.
      const daysAgoN = 6 + (currentCaseNum % 125); // Ages 6 to 130 days
      const dateReceived = daysAgo(daysAgoN);
      const slaConfig = SLA_CONFIGS.find(c => c.category === category) || SLA_CONFIGS[0];
      const slaDays = slaConfig.timeline_days;
      const expectedDisposal = new Date(dateReceived.getTime() + slaDays * 86400000);

      // Priority reflects the live statutory-clock pressure, not a coin flip.
      const elapsedFrac = daysAgoN / Math.max(1, slaDays);
      const priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" =
        status === "DISPOSED"
          ? currentCaseNum % 3 === 0 ? "MEDIUM" : "LOW"
          : status === "ESCALATED" || elapsedFrac >= 1
            ? "CRITICAL"
            : elapsedFrac >= 0.75
              ? "HIGH"
              : elapsedFrac >= 0.35 ? "MEDIUM" : (k % 2 === 0 ? "MEDIUM" : "LOW");

      const bureauCode = assigned.bureau === "REGULATION_BUREAU" ? "RB" : assigned.bureau === "APPROVAL_BUREAU" ? "AB" : assigned.bureau === "SKILL_CELL" ? "SDC" : "PGRC";
      const caseCode = `AICTE/${bureauCode}/2026/${String(currentCaseNum).padStart(5, "0")}`;

      // Complainant identity: ~30% of generated files reuse one of four repeat
      // complainants so recurrence analytics have demonstrable signal; the
      // remainder draw from a rotating unique-name pool.
      const isRepeatFiling = currentCaseNum % 13 < 4;
      const repeat = REPEAT_COMPLAINANTS[currentCaseNum % REPEAT_COMPLAINANTS.length];
      const firstName = UNIQUE_FIRST[(currentCaseNum * 7 + iIdx) % UNIQUE_FIRST.length];
      const lastName = UNIQUE_LAST[(currentCaseNum + iIdx * 3) % UNIQUE_LAST.length];
      const complainantName = isRepeatFiling ? repeat.name : `${firstName} ${lastName}`;
      const complainantContact = isRepeatFiling
        ? repeat.contact
        : `+91 97${String(10000000 + ((currentCaseNum * 137 + iIdx * 31) % 89999999)).slice(0, 8)}`;

      // Statutory hearings are scheduled on a slice of live files spread over
      // the next 28 days to populate the hearing calendar.
      const isActive = status !== "DISPOSED" && status !== "TRANSFERRED";
      const hearingDate =
        isActive && currentCaseNum % 11 === 2
          ? daysAhead(2 + (currentCaseNum % 26))
          : null;

      // Every fifth live file lands at the bureau desk without a named officer
      // yet, so the officer work-queue has a genuine allocation backlog.
      const isUnassigned = isActive && currentCaseNum % 5 === 0;

      const template = DESCRIPTIONS[category] ?? ["Grievance submitted regarding {inst}."];
      const description = template[(currentCaseNum + k) % template.length].replace(/\{inst\}/g, inst.name);

      // ── Rich action ledger (3-6 events per case) ──
      const actions: SeedCase["actions"] = [
        {
          actor_user: assigned.email,
          actor_bureau: assigned.bureau,
          action_type: "RECEIVED",
          remarks: RECEIVED_REMARKS[(currentCaseNum + k) % RECEIVED_REMARKS.length].replace(/\{source\}/g, source),
          timestamp: dateReceived,
          attachments: currentCaseNum % 7 === 3
            ? ["https://blob.vercel-storage.com/complaints/representation.pdf"]
            : [],
        },
      ];
      if (!isUnassigned) {
        actions.push({
          actor_user: assigned.email,
          actor_bureau: assigned.bureau,
          action_type: "ASSIGNED",
          remarks: "File assigned to the bureau desk for preliminary verification.",
          timestamp: new Date(dateReceived.getTime() + 1 * 86400000),
          attachments: [],
        });
      }
      if (status === "TRANSFERRED") {
        const toBureau = officers[(iIdx + k + 1) % officers.length].bureau;
        actions.push({
          actor_user: assigned.email,
          actor_bureau: assigned.bureau,
          action_type: "STATUS_CHANGED",
          remarks: "File transferred after bureau-level jurisdiction review for coordinated disposal.",
          timestamp: new Date(dateReceived.getTime() + 3 * 86400000),
          attachments: [],
          from_bureau: assigned.bureau,
          to_bureau: toBureau,
        });
      } else if (status !== "DISPOSED" && status !== "ESCALATED") {
        actions.push({
          actor_user: assigned.email,
          actor_bureau: assigned.bureau,
          action_type: "REMARK",
          remarks: INTERIM_REMARKS[(currentCaseNum + k) % INTERIM_REMARKS.length],
          timestamp: new Date(dateReceived.getTime() + 3 * 86400000),
          attachments: [],
        });
      }
      if (hearingDate) {
        actions.push({
          actor_user: assigned.email,
          actor_bureau: assigned.bureau,
          action_type: "HEARING_SCHEDULED",
          remarks: "Hearing scheduled before the Standing Grievance Committee; institution and complainant sides to be intimated.",
          timestamp: new Date(dateReceived.getTime() + 5 * 86400000),
          attachments: [],
        });
      }
      if (status === "DISPOSED") {
        actions.push({
          actor_user: assigned.email,
          actor_bureau: assigned.bureau,
          action_type: "DISPOSED",
          remarks: DISPOSED_REMARKS[(currentCaseNum + k) % DISPOSED_REMARKS.length],
          timestamp: new Date(dateReceived.getTime() + bump(Math.min(daysAgoN - 1, Math.round(slaDays * 0.9) + (currentCaseNum % 5))) * 86400000),
          attachments: ["https://blob.vercel-storage.com/orders/disposal_order.pdf"],
        });
      } else if (status === "ESCALATED") {
        actions.push({
          actor_user: assigned.email,
          actor_bureau: assigned.bureau,
          action_type: "ESCALATED",
          remarks: ESCALATED_REMARKS[(currentCaseNum + k) % ESCALATED_REMARKS.length],
          timestamp: new Date(dateReceived.getTime() + bump(Math.min(daysAgoN - 1, slaDays + 3)) * 86400000),
          attachments: [],
        });
      }

      const lastActionDate = actions[actions.length - 1].timestamp;

      const generatedCase: SeedCase = {
        id: `case_${currentCaseNum}`,
        case_id: caseCode,
        institution_id: inst.id,
        date_received: dateReceived,
        source,
        category,
        description,
        status,
        assigned_bureau: assigned.bureau as any,
        assigned_officer: isUnassigned ? "" : assigned.email,
        last_action: isUnassigned
          ? "Received at Bureau desk — awaiting officer allocation"
          : status === "DISPOSED" ? "Final Disposal Order uploaded to AICTE portal"
          : status === "ESCALATED" ? "Escalated to Member Secretary"
          : status === "TRANSFERRED" ? "File transferred between bureaus for coordinated handling"
          : "Notice issued to Head of Institution",
        last_action_date: lastActionDate,
        next_action_required: isUnassigned ? "Assign investigating officer" : status === "DISPOSED" ? null : "Verification of compliance report",
        expected_disposal_date: expectedDisposal,
        priority,
        complainant_name: complainantName,
        complainant_contact: complainantContact,
        hearing_date: hearingDate,
        actions,
      };

      cases.push(generatedCase);

      // ── Bureau coordination / internal desk threads on a slice of files ──
      if (!isUnassigned && currentCaseNum % 9 < 2) {
        const threadLength = 2 + (currentCaseNum % 2);
        for (let cIdx = 0; cIdx < threadLength; cIdx++) {
          const seedComment = COMMENT_BODIES[(currentCaseNum + cIdx) % COMMENT_BODIES.length];
          const author = OFFICER_POOL[(currentCaseNum * 3 + cIdx * 5 + iIdx) % OFFICER_POOL.length];
          comments.push({
            id: `cm_g_${commentSeq++}`,
            case_id: caseCode,
            author_email: author.email,
            author_name: author.name,
            author_bureau: author.bureau,
            body: seedComment.body,
            scope: seedComment.scope,
            created_at: new Date(dateReceived.getTime() + (2 + cIdx * 3) * 86400000),
          });
        }
      }
    }

    // ── Institution document vault entries for every third institution ──
    if (iIdx % 3 === 0) {
      const vaultUploaders = ["ab.officer@aicte.gov.in", "rb.officer@aicte.gov.in", "pgrc.officer@aicte.gov.in"];
      documents.push({
        id: `doc_g_${documentSeq++}`,
        institution_id: inst.id,
        title: `Extension of Approval 2026-27 (${inst.institution_type}, ${60 + (iIdx % 5) * 30} seats)`,
        doc_type: "APPROVAL_LETTER",
        blob_url: `https://blob.vercel-storage.com/vault/inst${iIdx + 1}_eoa_2026_27.pdf`,
        file_name: `inst${iIdx + 1}_eoa_2026_27.pdf`,
        file_size: 300_000 + ((iIdx * 7919) % 400_000),
        uploaded_by: vaultUploaders[iIdx % vaultUploaders.length],
        notes: "Sanctioned intake letter with standard pre-approval conditions for the current academic year.",
        uploaded_at: daysAgo(40 + ((iIdx * 7) % 100)),
      });
      documents.push({
        id: `doc_g_${documentSeq++}`,
        institution_id: inst.id,
        title: "Compliance Report on AY 2025-26 Disposal Orders",
        doc_type: "COMPLIANCE_REPORT",
        blob_url: `https://blob.vercel-storage.com/vault/inst${iIdx + 1}_compliance_2025_26.pdf`,
        file_name: `inst${iIdx + 1}_compliance_2025_26.pdf`,
        file_size: 150_000 + ((iIdx * 3571) % 250_000),
        uploaded_by: vaultUploaders[(iIdx + 2) % vaultUploaders.length],
        uploaded_at: daysAgo(20 + ((iIdx * 11) % 90)),
      });
    }
  });

  // Post-pass: guarantee a handful of regional-language grievances so the
  // offline multilingual intake layer has demo material on a clean install.
  const HINDI_CAPITATION =
    "संस्थान से प्रथम वर्ष के छात्रों से प्रवेश के समय रु. 38,500 अतिरिक्त शुल्क के रूप में वसूले गए हैं, जो स्वीकृत शुल्क संरचना से परे हैं। रसीदें एक अपंजीकृत ट्रस्ट खाते में जमा हो रही हैं।";
  const HINDI_CERTIFICATES =
    "संस्थान छात्रों के मूल प्रमाण पत्र और मार्कशीट रोककर रखा है और इन्हें जारी करने के लिए अनुचित रूप से रु. 7,500 के 'प्रबंधन शुल्क' की मांग कर रहा है। समय पर जारी न होने से छात्रों की नियुक्ति प्रक्रिया प्रभावित हो रही है।";
  const TAMIL_CERTIFICATES =
    "நிறுவனம் மாணவர்களின் அசல் சான்றிதழ்களையும் மதிப்பெண் சான்றிதழ்களையும் வைத்திருந்து, அவற்றை வெளியிட நிர்வாகக் கட்டணமாக ரூ. 7,500 அந்நியமாகக் கேட்கிறது. இதனால் மாணவர்களின் வேலைவாய்ப்பு ஒப்படைப்பு தடைபடுகிறது.";

  const localizeCases = (match: (c: SeedCase) => boolean, limit: number, text: string, lang: string) => {
    let applied = 0;
    for (const c of cases) {
      if (applied >= limit) break;
      if (match(c)) {
        c.description = text;
        c.language = lang;
        applied++;
      }
    }
  };
  localizeCases(
    (c) => c.category === "Capitation Fee & Overcharging" && c.status !== "DISPOSED" &&
      ["Northern", "Central", "North-Western"].includes(institutions.find((i) => i.id === c.institution_id)!.region),
    6,
    HINDI_CAPITATION,
    "hi"
  );
  localizeCases(
    (c) => c.category === "Withholding Certificates" && c.status !== "DISPOSED" &&
      ["Southern", "South-Western"].includes(institutions.find((i) => i.id === c.institution_id)!.region),
    5,
    TAMIL_CERTIFICATES,
    "ta"
  );
  localizeCases(
    (c) => c.category === "Withholding Certificates" && c.language !== "ta" && c.status !== "DISPOSED" &&
      ["Northern", "Central", "Eastern"].includes(institutions.find((i) => i.id === c.institution_id)!.region),
    3,
    HINDI_CERTIFICATES,
    "hi"
  );

  // ── Inter-bureau coordination threads (comments) ────────────────────────────
  comments.push(
    {
      id: "cm_001",
      case_id: "AICTE/PGRC/2026/00101",
      author_email: "rb.officer@aicte.gov.in",
      author_name: "Dr. Ramesh Unnikrishnan",
      author_bureau: "REGULATION_BUREAU",
      body: "Regulation Bureau has an active parallel file on capitation collection at the same institution. Requesting PGRC to share the show-cause response so both files can proceed as one record and the institution does not face contradictory notices.",
      scope: "COORDINATION",
      created_at: daysAgo(12),
    },
    {
      id: "cm_002",
      case_id: "AICTE/PGRC/2026/00101",
      author_email: "pgrc.officer@aicte.gov.in",
      author_name: "Smt. Sunita Chhibba",
      author_bureau: "PGRC",
      body: "Shared. Institution response is due by the Standing Grievance Committee hearing; joint agenda item is proposed so the master docket can be established in that sitting.",
      scope: "COORDINATION",
      created_at: daysAgo(10),
    },
    {
      id: "cm_003",
      case_id: "AICTE/PGRC/2026/00101",
      author_email: "pgrc.officer@aicte.gov.in",
      author_name: "Smt. Sunita Chhibba",
      author_bureau: "PGRC",
      body: "Internal desk note: hearing panel composition confirmed; complainant representation (Student Union) verified on record before the sitting.",
      scope: "INTERNAL",
      created_at: daysAgo(6),
    },
    {
      id: "cm_004",
      case_id: "AICTE/RB/2026/00042",
      author_email: "rb.officer@aicte.gov.in",
      author_name: "Dr. Ramesh Unnikrishnan",
      author_bureau: "REGULATION_BUREAU",
      body: "Noted PGRC's parallel proceeding. Holding the surprise EVC inspection until a master docket is established to avoid two committees landing on campus in the same week.",
      scope: "COORDINATION",
      created_at: daysAgo(9),
    },
    {
      id: "cm_005",
      case_id: "AICTE/RB/2026/00042",
      author_email: "rb.senior@aicte.gov.in",
      author_name: "Smt. Meera Iyer",
      author_bureau: "REGULATION_BUREAU",
      body: "Desk level: compiled the fee-committee register extracts for the last two academic years; will be tabled when the committee sitting is fixed.",
      scope: "INTERNAL",
      created_at: daysAgo(4),
    }
  );

  // ── Institution document vault (statutory records) ─────────────────────────
  documents.push(
    {
      id: "doc_001",
      institution_id: "inst_1",
      title: "Extension of Approval 2026-27 (60 seats, CSE)",
      doc_type: "APPROVAL_LETTER",
      blob_url: "https://blob.vercel-storage.com/vault/apinst_eoa_2026_27.pdf",
      file_name: "apinst_eoa_2026_27.pdf",
      file_size: 428_610,
      uploaded_by: "ab.officer@aicte.gov.in",
      notes: "Sanctioned intake letter for Computer Science & Engineering with standard pre-approval conditions.",
      uploaded_at: daysAgo(120),
    },
    {
      id: "doc_002",
      institution_id: "inst_1",
      title: "Approved Fee Structure 2026-27 (Fee Committee)",
      doc_type: "FINANCIAL_RECORD",
      blob_url: "https://blob.vercel-storage.com/vault/apinst_fee_structure.pdf",
      file_name: "apinst_fee_structure.pdf",
      file_size: 233_418,
      uploaded_by: "rb.officer@aicte.gov.in",
      case_id: "AICTE/PGRC/2026/00101",
      notes: "Referenced in the capitation enquiry as the statutory fee ceiling.",
      uploaded_at: daysAgo(49),
    },
    {
      id: "doc_003",
      institution_id: "inst_1",
      title: "Internal Accounts Extract (Defense & Training Fund Head)",
      doc_type: "AUDIT_STATEMENT",
      blob_url: "https://blob.vercel-storage.com/vault/apinst_internal_accounts.pdf",
      file_name: "apinst_internal_accounts.pdf",
      file_size: 512_904,
      uploaded_by: "rb.officer@aicte.gov.in",
      case_id: "AICTE/RB/2026/00042",
      uploaded_at: daysAgo(20),
    },
    {
      id: "doc_004",
      institution_id: "inst_2",
      title: "Compliance Report on 2025 Disposal Order",
      doc_type: "COMPLIANCE_REPORT",
      blob_url: "https://blob.vercel-storage.com/vault/stxavier_compliance.pdf",
      file_name: "stxavier_compliance.pdf",
      file_size: 188_212,
      uploaded_by: "pgrc.officer@aicte.gov.in",
      uploaded_at: daysAgo(102),
    },
    {
      id: "doc_005",
      institution_id: "inst_3",
      title: "Show-Cause Notice Copy (SCN/KANPUR/2026/011)",
      doc_type: "SHOW_CAUSE_NOTICE",
      blob_url: "https://blob.vercel-storage.com/vault/hbtu_sln_copy.pdf",
      file_name: "hbtu_sln_copy.pdf",
      file_size: 119_942,
      uploaded_by: "rb.officer@aicte.gov.in",
      uploaded_at: daysAgo(61),
    },
    {
      id: "doc_006",
      institution_id: "inst_4",
      title: "Land & Building Ownership Deed (Campus)",
      doc_type: "OTHER",
      blob_url: "https://blob.vercel-storage.com/vault/dehradun_deed.pdf",
      file_name: "dehradun_deed.pdf",
      file_size: 764_331,
      uploaded_by: "ab.officer@aicte.gov.in",
      uploaded_at: daysAgo(144),
    },
    {
      id: "doc_007",
      institution_id: "inst_26",
      title: "Anti-Ragging Committee Constitution (2026-27)",
      doc_type: "COMPLIANCE_REPORT",
      blob_url: "https://blob.vercel-storage.com/vault/coimbatore_arc.pdf",
      file_name: "coimbatore_arc.pdf",
      file_size: 97_500,
      uploaded_by: "pgrc.officer@aicte.gov.in",
      uploaded_at: daysAgo(105),
    },
    {
      id: "doc_008",
      institution_id: "inst_37",
      title: "Court Direction on Certificate Withholding (WP 8412/2026)",
      doc_type: "COURT_ORDER",
      blob_url: "https://blob.vercel-storage.com/vault/kolkata_wp_8412.pdf",
      file_name: "kolkata_wp_8412.pdf",
      file_size: 301_760,
      uploaded_by: "ro.north@aicte.gov.in",
      uploaded_at: daysAgo(54),
    }
  );

  return { institutions, cases, overlapAlerts, comments, documents };
}
