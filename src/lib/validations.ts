import { z } from "zod";

export const CaseStatusEnum = z.enum([
  "PENDING",
  "UNDER_PROCESS",
  "DISPOSED",
  "TRANSFERRED",
  "ESCALATED",
]);

export const BureauEnum = z.enum([
  "REGULATION_BUREAU",
  "PGRC",
  "APPROVAL_BUREAU",
  "SKILL_CELL",
]);

export const CasePriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const LinkTypeEnum = z.enum(["OVERLAP", "DUPLICATE", "RELATED"]);

export const UpdateStatusSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  status: CaseStatusEnum,
  remarks: z.string().min(5, "Remarks must be at least 5 characters long"),
  attachments: z.array(z.string().url()).optional(),
});

export const TransferCaseSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  toBureau: BureauEnum,
  remarks: z.string().min(10, "Please provide detailed justification for Bureau transfer (min 10 characters)"),
  attachments: z.array(z.string().url()).optional(),
});

export const EscalateCaseSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  remarks: z.string().min(10, "Please provide reasons for escalation to Competent Authority (min 10 characters)"),
  attachments: z.array(z.string().url()).optional(),
});

export const AddRemarkSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  remarks: z.string().min(3, "Remark must be at least 3 characters long"),
  attachments: z.array(z.string().url()).optional(),
});

export const LinkCasesSchema = z.object({
  caseAId: z.string().min(1, "Primary Case ID is required"),
  caseBId: z.string().min(1, "Target Case ID is required"),
  linkType: LinkTypeEnum,
  note: z.string().optional(),
});

export const CoordinateOverlapSchema = z.object({
  alertId: z.string().min(1, "Alert ID is required"),
  coordinationNote: z.string().min(5, "Coordination note must be at least 5 characters long"),
});

export const DismissOverlapSchema = z.object({
  alertId: z.string().min(1, "Alert ID is required"),
  dismissedReason: z.string().min(5, "Reason for dismissal must be at least 5 characters long"),
});

export const MergeOverlapSchema = z.object({
  alertId: z.string().min(1, "Alert ID is required"),
  masterCaseId: z.string().min(1, "Select the master docket"),
  mergeNote: z
    .string()
    .min(10, "Provide a merge justification of at least 10 characters"),
});

export const IngestionChannelEnum = z.enum([
  "CPGRAMS",
  "UGC_ESAMADHAN",
  "DIRECT_PORTAL",
  "EMAIL_OCR",
  "VIGILANCE",
]);

export const SimulateIngestionSchema = z.object({
  channel: IngestionChannelEnum,
  aicte_permanent_id: z.string().min(1, "Select an institution"),
  category: z.string().min(1, "Category is required"),
  description: z
    .string()
    .min(30, "Describe the grievance in at least 30 characters"),
  priority: CasePriorityEnum.default("MEDIUM"),
  assigned_bureau: BureauEnum.optional(),
  complainant_reference: z.string().optional(),
  complainant_name: z.string().max(120, "Complainant name is too long").optional(),
  complainant_contact: z.string().max(60, "Complainant contact is too long").optional(),
});

export const CreateCaseSchema = z.object({
  aicte_permanent_id: z.string().min(1, "AICTE Permanent ID is required"),
  source: z.enum(["student", "faculty", "stakeholder", "public", "other"]),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(15, "Description must be at least 15 characters long"),
  assigned_bureau: BureauEnum,
  priority: CasePriorityEnum.default("MEDIUM"),
  complainant_name: z.string().max(120, "Complainant name is too long").optional(),
  complainant_contact: z.string().max(60, "Complainant contact is too long").optional(),
  language: z.string().max(10).optional(),
  attachments: z.array(z.string().url()).optional(),
});

export const AssignOfficerSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  officerEmail: z.string().min(3, "Select an officer"),
  note: z.string().max(500, "Instruction must be 500 characters or fewer").optional(),
});

export const ScheduleHearingSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  hearingDate: z.coerce.date().refine(
    (d) => d.getTime() > Date.now() - 86400000,
    "Hearing date must be today or in the future"
  ),
});

export const AddCaseCommentSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  body: z.string().min(3, "Comment must be at least 3 characters").max(2000, "Comment is too long"),
  scope: z.enum(["COORDINATION", "INTERNAL"]).default("COORDINATION"),
});

export const FieldVerificationSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  findings: z
    .string()
    .min(20, "Field verification findings need at least 20 characters for audit quality"),
  attachments: z.array(z.string().url()).optional(),
});

export const AddInstitutionDocumentSchema = z.object({
  institutionId: z.string().min(1, "Institution is required"),
  title: z.string().min(4, "Title must be at least 4 characters").max(180),
  docType: z.enum([
    "APPROVAL_LETTER",
    "COMPLIANCE_REPORT",
    "AUDIT_STATEMENT",
    "SHOW_CAUSE_NOTICE",
    "COURT_ORDER",
    "FINANCIAL_RECORD",
    "OTHER",
  ]),
  blobUrl: z.string().url("Upload the file before saving the record"),
  fileName: z.string().min(1),
  fileSize: z.number().int().min(0).max(10 * 1024 * 1024 + 1),
  notes: z.string().max(600).optional(),
  linkedCase: z.string().max(64).optional(),
});

export const RemoveInstitutionDocumentSchema = z.object({
  documentId: z.string().min(1, "Document record is required"),
});

const UserRoleEnum = z.enum([
  "ADMIN",
  "COMPETENT_AUTHORITY",
  "REGULATION_OFFICER",
  "PGRC_OFFICER",
  "BUREAU_OFFICER",
  "REGIONAL_OFFICER",
]);

const UserBureauEnum = z.enum([
  "REGULATION_BUREAU",
  "PGRC",
  "APPROVAL_BUREAU",
  "SKILL_CELL",
  "ALL",
]);

export const CreateUserSchema = z.object({
  name: z.string().min(3, "Full name must be at least 3 characters").max(100),
  email: z
    .string()
    .email("Enter a valid official email")
    .max(120)
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72)
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/[0-9@#$%^&*!_\-+=]/, "Password must contain a number or symbol"),
  role: UserRoleEnum,
  bureau: UserBureauEnum,
  region: z.string().max(40).optional().nullable(),
  designation: z.string().max(140).optional().nullable(),
});

export const UpdateUserSchema = z.object({
  userId: z.string().min(1),
  role: UserRoleEnum.optional(),
  bureau: UserBureauEnum.optional(),
  region: z.string().max(40).optional().nullable(),
  designation: z.string().max(140).optional().nullable(),
  active: z.boolean().optional(),
});

export const ResetUserPasswordSchema = z.object({
  userId: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72)
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/[0-9@#$%^&*!_\-+=]/, "Password must contain a number or symbol"),
});

export const TrackCaseSchema = z.object({
  registryNo: z
    .string()
    .min(10, "Enter the full registry number, e.g. AICTE/PGRC/2026/00101")
    .max(48)
    .transform((v) => v.trim().replace(/\s+/g, "").toUpperCase()),
});

// -----------------------------------------------------------------------------
// AI feature validations
// -----------------------------------------------------------------------------
export const AiSummarizeCaseSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
});

export const AiSuggestClassificationSchema = z.object({
  caseId: z.string().optional(),
  description: z.string().min(15, "Describe the grievance in at least 15 characters"),
  language: z.string().max(10).optional(),
  institutionState: z.string().optional(),
  currentCategory: z.string().optional(),
  currentBureau: z.string().optional(),
  currentPriority: z.string().optional(),
});

export const AiDraftReplySchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  replyType: z.enum([
    "ACKNOWLEDGEMENT",
    "STATUS_UPDATE",
    "RESOLUTION",
    "SHOW_CAUSE",
    "HEARING_NOTICE",
  ]),
  language: z.string().max(10).optional(),
  officerName: z.string().max(120, "Officer name is too long").optional(),
});

export const AiTranslateSchema = z.object({
  text: z.string().min(3, "Text is required"),
  from: z.string().max(10),
  to: z.string().max(10),
});

export const AiExplainOverlapSchema = z.object({
  alertId: z.string().min(1, "Alert ID is required"),
});

