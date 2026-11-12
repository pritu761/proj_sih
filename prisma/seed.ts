import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { DEMO_USERS, SLA_CONFIGS } from "../src/lib/demo-data";
import { generateSeedData } from "../src/lib/mock-data-generator";

/**
 * Idempotent demo seed.
 *
 * The demo dataset is authoritative from `generateSeedData()`; every reseed
 * therefore (1) wipes all demo tables in FK-safe order, then (2) re-inserts
 * the freshly generated store in batched `createMany` calls. Comments and
 * document case-linkages are keyed by registry number in the store but by
 * internal Case id in the database, so both are remapped through
 * `registryToInternalId` before insertion.
 */

/** Split an array into fixed-size batches for bulk inserts. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function main() {
  console.log("🌱 Starting AICTE Complaint Monitoring Dashboard Database Seed...");
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/aicte_db";
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Seed SLA Configurations
    console.log("⚙️  Seeding SLA configurations...");
    for (const sla of SLA_CONFIGS) {
      await prisma.slaConfig.upsert({
        where: { category: sla.category },
        update: {
          timeline_days: sla.timeline_days,
          warning_threshold_percent: sla.warning_threshold_percent,
        },
        create: {
          category: sla.category,
          timeline_days: sla.timeline_days,
          warning_threshold_percent: sla.warning_threshold_percent,
        },
      });
    }

    // 2. Seed Demo Users
    console.log("👥 Seeding RBAC Demo Users...");
    for (const u of DEMO_USERS) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          password_hash: passwordHash,
          role: u.role,
          bureau: u.bureau,
          region: u.region,
          designation: u.designation,
        },
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          password_hash: passwordHash,
          role: u.role,
          bureau: u.bureau,
          region: u.region,
          designation: u.designation,
        },
      });
    }

    // 3. Generate the enriched demo dataset
    const { institutions, cases, overlapAlerts, comments, documents } = generateSeedData();

    // 4. Wipe all demo tables in FK-safe order. Users and SLA configs are kept.
    console.log("🧹 Clearing existing demo data (FK-safe order)...");
    await prisma.grievanceWatcher.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.caseComment.deleteMany({});
    await prisma.institutionDocument.deleteMany({});
    await prisma.caseLink.deleteMany({});
    await prisma.overlapAlert.deleteMany({});
    await prisma.actionHistory.deleteMany({});
    await prisma.case.deleteMany({});
    await prisma.institution.deleteMany({});
    await prisma.appStateSnapshot.deleteMany({});
    await prisma.auditLog.deleteMany({});

    // 5. Institutions (batched)
    console.log(`🏛️  Seeding ${institutions.length} institutions across 7 AICTE regions...`);
    for (const batch of chunk(institutions, 100)) {
      await prisma.institution.createMany({
        data: batch.map((inst) => ({
          id: inst.id,
          aicte_permanent_id: inst.aicte_permanent_id,
          name: inst.name,
          normalized_name: inst.normalized_name,
          address: inst.address,
          city: inst.city,
          state: inst.state,
          pincode: inst.pincode,
          region: inst.region,
          institution_type: inst.institution_type,
          contact_email: inst.contact_email,
          contact_phone: inst.contact_phone,
        })),
        skipDuplicates: true,
      });
    }

    // 6. Cases (batched) — full field set incl. complainant identity, intake
    //    language and the scheduled statutory hearing date.
    console.log(`📋 Seeding ${cases.length} cases with complete workflow histories...`);
    const registryToInternalId = new Map<string, string>();
    for (const batch of chunk(cases, 200)) {
      await prisma.case.createMany({
        data: batch.map((c) => {
          registryToInternalId.set(c.case_id, c.id);
          return {
            id: c.id,
            case_id: c.case_id,
            institution_id: c.institution_id,
            date_received: c.date_received,
            source: c.source,
            category: c.category,
            description: c.description,
            status: c.status,
            assigned_bureau: c.assigned_bureau,
            assigned_officer: c.assigned_officer,
            last_action: c.last_action,
            last_action_date: c.last_action_date,
            next_action_required: c.next_action_required,
            expected_disposal_date: c.expected_disposal_date,
            priority: c.priority,
            complainant_name: c.complainant_name ?? null,
            complainant_contact: c.complainant_contact ?? null,
            language: c.language ?? null,
            hearing_date: c.hearing_date ?? null,
          };
        }),
        skipDuplicates: true,
      });
    }

    // 7. Action ledgers (batched) — one row per workflow event per case.
    const actionRows = cases.flatMap((c) =>
      c.actions.map((act) => ({
        case_id: c.id,
        actor_user: act.actor_user,
        actor_bureau: act.actor_bureau,
        action_type: act.action_type,
        remarks: act.remarks,
        attachments: act.attachments,
        timestamp: act.timestamp,
        from_bureau: act.from_bureau ?? null,
        to_bureau: act.to_bureau ?? null,
      }))
    );
    console.log(`🗂️  Seeding ${actionRows.length} workflow action entries...`);
    for (const batch of chunk(actionRows, 500)) {
      await prisma.actionHistory.createMany({ data: batch });
    }

    // 8. Overlap alerts — store-only merge/trilayer extras are not persisted.
    console.log(`⚠️  Seeding ${overlapAlerts.length} deliberate cross-bureau overlap alerts...`);
    for (const batch of chunk(overlapAlerts, 100)) {
      await prisma.overlapAlert.createMany({
        data: batch.map((ovl) => ({
          id: ovl.id,
          institution_id: ovl.institution_id,
          case_ids: ovl.case_ids,
          bureaus_involved: ovl.bureaus_involved,
          confidence: ovl.confidence,
          match_reasons: ovl.match_reasons,
          detected_at: ovl.detected_at,
          status: ovl.status,
          coordination_note: ovl.coordination_note,
          dismissed_reason: ovl.dismissed_reason,
        })),
        skipDuplicates: true,
      });
    }

    // 9. Bureau coordination threads — store keys by registry number, the DB
    //    keys by internal Case id, so remap before insert.
    const commentRows = comments
      .filter((cm) => registryToInternalId.has(cm.case_id))
      .map((cm) => ({
        id: cm.id,
        case_id: registryToInternalId.get(cm.case_id)!,
        author_email: cm.author_email,
        author_name: cm.author_name,
        author_bureau: cm.author_bureau,
        body: cm.body,
        scope: cm.scope,
        created_at: cm.created_at,
      }));
    console.log(`💬 Seeding ${commentRows.length} coordination / desk comments...`);
    for (const batch of chunk(commentRows, 500)) {
      await prisma.caseComment.createMany({ data: batch });
    }

    // 10. Institution document vault — optional case linkage remapped the same
    //     way; documents without a resolvable case keep a null linkage.
    const docRows = documents.map((d) => ({
      id: d.id,
      institution_id: d.institution_id,
      title: d.title,
      doc_type: d.doc_type,
      blob_url: d.blob_url,
      file_name: d.file_name,
      file_size: d.file_size,
      uploaded_by: d.uploaded_by,
      notes: d.notes ?? null,
      case_id: (d.case_id && registryToInternalId.get(d.case_id)) || null,
      uploaded_at: d.uploaded_at,
    }));
    console.log(`📄 Seeding ${docRows.length} vault documents...`);
    for (const batch of chunk(docRows, 500)) {
      await prisma.institutionDocument.createMany({ data: batch });
    }

    // 11. Initial Seed Notifications
    console.log("🔔 Seeding initial notifications...");
    await prisma.notification.createMany({
      data: [
        {
          type: "OVERLAP",
          case_id: "case_00101",
          target_bureau: "PGRC",
          title: "Potential Overlapping Cases – Coordination Required",
          message: "Collision detected with Case AICTE/RB/2026/00042 regarding Apex Institute of Engineering & Technology.",
          read: false,
        },
        {
          type: "OVERLAP",
          case_id: "case_00042",
          target_bureau: "REGULATION_BUREAU",
          title: "Potential Overlapping Cases – Coordination Required",
          message: "Collision detected with Case AICTE/PGRC/2026/00101 regarding Apex Institute of Engineering & Technology.",
          read: false,
        },
        {
          type: "SLA_BREACHED",
          case_id: "case_00101",
          target_bureau: "PGRC",
          title: "SLA Breached: Case AICTE/PGRC/2026/00101",
          message: "Case has exceeded the 30-day resolution timeline. Immediate action or escalation required.",
          read: false,
        },
      ],
    });

    console.log("✅ Seed completed successfully!");
    console.log(`- SLA Categories: ${SLA_CONFIGS.length}`);
    console.log(`- RBAC Demo Users: ${DEMO_USERS.length}`);
    console.log(`- Institutions: ${institutions.length}`);
    console.log(`- Cases: ${cases.length}`);
    console.log(`- Workflow Actions: ${actionRows.length}`);
    console.log(`- Comments: ${commentRows.length}`);
    console.log(`- Vault Documents: ${docRows.length}`);
    console.log(`- Overlap Alerts: ${overlapAlerts.length}`);
  } catch (error) {
    console.error("❌ Seed error:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
