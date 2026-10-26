import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { DEMO_USERS, SLA_CONFIGS } from "../src/lib/demo-data";
import { generateSeedData } from "../src/lib/mock-data-generator";

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

    // 3. Generate and Seed Institutions, Cases, Actions, Overlaps
    const { institutions, cases, overlapAlerts } = generateSeedData();

    console.log(`🏛️  Seeding ${institutions.length} institutions across 5 AICTE regions...`);
    for (const inst of institutions) {
      await prisma.institution.upsert({
        where: { aicte_permanent_id: inst.aicte_permanent_id },
        update: {
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
        },
        create: {
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
        },
      });
    }

    console.log(`📋 Seeding ${cases.length} cases with complete workflow histories...`);
    for (const c of cases) {
      await prisma.case.upsert({
        where: { case_id: c.case_id },
        update: {
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
        },
        create: {
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
        },
      });

      // Actions
      for (const act of c.actions) {
        await prisma.actionHistory.create({
          data: {
            case_id: c.id,
            actor_user: act.actor_user,
            actor_bureau: act.actor_bureau,
            action_type: act.action_type,
            remarks: act.remarks,
            attachments: act.attachments,
            timestamp: act.timestamp,
          },
        });
      }
    }

    console.log(`⚠️  Seeding ${overlapAlerts.length} deliberate cross-bureau overlap alerts...`);
    for (const ovl of overlapAlerts) {
      await prisma.overlapAlert.upsert({
        where: { id: ovl.id },
        update: {
          institution_id: ovl.institution_id,
          case_ids: ovl.case_ids,
          bureaus_involved: ovl.bureaus_involved,
          confidence: ovl.confidence,
          match_reasons: ovl.match_reasons,
          detected_at: ovl.detected_at,
          status: ovl.status,
          coordination_note: ovl.coordination_note,
        },
        create: {
          id: ovl.id,
          institution_id: ovl.institution_id,
          case_ids: ovl.case_ids,
          bureaus_involved: ovl.bureaus_involved,
          confidence: ovl.confidence,
          match_reasons: ovl.match_reasons,
          detected_at: ovl.detected_at,
          status: ovl.status,
          coordination_note: ovl.coordination_note,
        },
      });
    }

    // 4. Initial Seed Notifications
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
