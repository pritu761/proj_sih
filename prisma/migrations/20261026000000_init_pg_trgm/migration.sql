-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateTable: Institution
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "aicte_permanent_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "institution_type" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Case
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "date_received" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assigned_bureau" TEXT NOT NULL,
    "assigned_officer" TEXT NOT NULL,
    "last_action" TEXT NOT NULL,
    "last_action_date" TIMESTAMP(3) NOT NULL,
    "next_action_required" TEXT,
    "expected_disposal_date" TIMESTAMP(3) NOT NULL,
    "priority" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ActionHistory
CREATE TABLE "ActionHistory" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_user" TEXT NOT NULL,
    "actor_bureau" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "remarks" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "from_bureau" TEXT,
    "to_bureau" TEXT,

    CONSTRAINT "ActionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CaseLink
CREATE TABLE "CaseLink" (
    "id" TEXT NOT NULL,
    "case_a_id" TEXT NOT NULL,
    "case_b_id" TEXT NOT NULL,
    "link_type" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "CaseLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OverlapAlert
CREATE TABLE "OverlapAlert" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "case_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bureaus_involved" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence" TEXT NOT NULL,
    "match_reasons" JSONB NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "coordination_note" TEXT,
    "dismissed_reason" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OverlapAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "case_id" TEXT,
    "target_bureau" TEXT,
    "target_user" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SlaConfig
CREATE TABLE "SlaConfig" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "timeline_days" INTEGER NOT NULL,
    "warning_threshold_percent" INTEGER NOT NULL DEFAULT 80,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "bureau" TEXT NOT NULL,
    "region" TEXT,
    "designation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "Institution_aicte_permanent_id_key" ON "Institution"("aicte_permanent_id");
CREATE UNIQUE INDEX "Case_case_id_key" ON "Case"("case_id");
CREATE UNIQUE INDEX "CaseLink_case_a_id_case_b_id_key" ON "CaseLink"("case_a_id", "case_b_id");
CREATE UNIQUE INDEX "SlaConfig_category_key" ON "SlaConfig"("category");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Standard indexes
CREATE INDEX "Institution_normalized_name_idx" ON "Institution"("normalized_name");
CREATE INDEX "Institution_region_idx" ON "Institution"("region");
CREATE INDEX "Institution_city_idx" ON "Institution"("city");
CREATE INDEX "Institution_state_idx" ON "Institution"("state");

-- Trigram GIN index for fuzzy institution name matching
CREATE INDEX "idx_institutions_normalized_name_trgm" ON "Institution" USING gin ("normalized_name" gin_trgm_ops);

CREATE INDEX "Case_institution_id_idx" ON "Case"("institution_id");
CREATE INDEX "Case_status_idx" ON "Case"("status");
CREATE INDEX "Case_assigned_bureau_idx" ON "Case"("assigned_bureau");
CREATE INDEX "Case_date_received_idx" ON "Case"("date_received");
CREATE INDEX "Case_priority_idx" ON "Case"("priority");

CREATE INDEX "ActionHistory_case_id_idx" ON "ActionHistory"("case_id");
CREATE INDEX "ActionHistory_timestamp_idx" ON "ActionHistory"("timestamp");

CREATE INDEX "CaseLink_case_a_id_idx" ON "CaseLink"("case_a_id");
CREATE INDEX "CaseLink_case_b_id_idx" ON "CaseLink"("case_b_id");

CREATE INDEX "OverlapAlert_institution_id_idx" ON "OverlapAlert"("institution_id");
CREATE INDEX "OverlapAlert_status_idx" ON "OverlapAlert"("status");

CREATE INDEX "Notification_target_bureau_idx" ON "Notification"("target_bureau");
CREATE INDEX "Notification_target_user_idx" ON "Notification"("target_user");
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

CREATE INDEX "AuditLog_user_idx" ON "AuditLog"("user");
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");

-- Foreign key constraints
ALTER TABLE "Case" ADD CONSTRAINT "Case_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActionHistory" ADD CONSTRAINT "ActionHistory_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseLink" ADD CONSTRAINT "CaseLink_case_a_id_fkey" FOREIGN KEY ("case_a_id") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseLink" ADD CONSTRAINT "CaseLink_case_b_id_fkey" FOREIGN KEY ("case_b_id") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OverlapAlert" ADD CONSTRAINT "OverlapAlert_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
