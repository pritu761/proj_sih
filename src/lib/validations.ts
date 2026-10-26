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

export const CreateCaseSchema = z.object({
  aicte_permanent_id: z.string().min(1, "AICTE Permanent ID is required"),
  source: z.enum(["student", "faculty", "stakeholder", "public", "other"]),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(15, "Description must be at least 15 characters long"),
  assigned_bureau: BureauEnum,
  priority: CasePriorityEnum.default("MEDIUM"),
  attachments: z.array(z.string().url()).optional(),
});
