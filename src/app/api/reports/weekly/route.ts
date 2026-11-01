import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { SessionUser } from "@/lib/rbac";
import { computeBureauScorecard } from "@/lib/services/scorecard";
import { RECUR_THRESHOLDS } from "@/lib/services/complainant-engine";

/**
 * Weekly Executive Digest — statutory weekly review pack compiled straight from
 * the live store: week-on-week intake/disposal, bureau scorecard grading,
 * next-week hearing board and the recurring-complainant watch summary.
 */

const BUREAU_LABEL: Record<string, string> = {
  REGULATION_BUREAU: "Regulation Bureau",
  PGRC: "Public Grievance Redressal Cell (PGRC)",
  APPROVAL_BUREAU: "Approval Bureau",
  SKILL_CELL: "Skill Development Cell",
};

function escapePdf(text: string): string {
  return text.replace(/[^\x20-\x7E]/g, "?");
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as unknown as SessionUser;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const [metrics, heard, complainantProfiles, casePage] = await Promise.all([
    repository.getDashboardMetrics(user),
    repository.getUpcomingHearings(user, 7),
    Promise.resolve(repository.getComplainantInsights(user)),
    repository.getCases({ limit: 1000, page: 1 }, user),
  ]);

  const rawCases = casePage.cases;
  const scorecard = computeBureauScorecard(
    rawCases.map((c) => ({
      case_id: c.case_id,
      status: c.status,
      assigned_bureau: c.assigned_bureau,
      date_received: c.date_received,
      last_action_date: c.last_action_date,
      category: c.category,
    })),
    now
  );

  const receivedInWeek = rawCases.filter(
    (c) => new Date(c.date_received).getTime() >= weekAgo.getTime()
  ).length;
  const disposedInWeek = rawCases.filter(
    (c) =>
      c.status === "DISPOSED" &&
      new Date(c.last_action_date).getTime() >= weekAgo.getTime()
  ).length;

  const prolific = complainantProfiles.filter((p) => p.level === "PROLIFIC");
  const repeat = complainantProfiles.filter((p) => p.level === "REPEAT");

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: rgb(0.04, 0.15, 0.25) });

  page.drawText("ALL INDIA COUNCIL FOR TECHNICAL EDUCATION", {
    x: 40, y: height - 42, size: 14, font: fontBold, color: rgb(1, 0.78, 0.2),
  });
  page.drawText("Weekly Grievance Executive Digest", {
    x: 40, y: height - 60, size: 11, font: fontRegular, color: rgb(1, 1, 1),
  });
  page.drawText(
    `Reporting window: ${weekAgo.toLocaleDateString("en-IN")} – ${now.toLocaleDateString("en-IN")} | Prepared for: ${escapePdf(user.name)} (${escapePdf(user.role)})`,
    { x: 40, y: height - 80, size: 8, font: fontRegular, color: rgb(0.8, 0.85, 0.9) }
  );

  let y = height - 120;
  const section = (title: string) => {
    page.drawText(title, {
      x: 40, y, size: 11, font: fontBold, color: rgb(0.04, 0.15, 0.25),
    });
    y -= 18;
  };

  // 1 — Week at a glance
  section("1. WEEK AT A GLANCE");
  const glance = [
    { label: "New grievances received this week", val: String(receivedInWeek) },
    { label: "Disposals completed this week", val: String(disposedInWeek) },
    { label: "Open case stock", val: String(metrics.kpi.pending + metrics.kpi.underProcess + metrics.kpi.escalated) },
    { label: "Files beyond statutory timeline", val: String(metrics.kpi.pendingBeyondTimeline), warn: true },
    { label: "Open cross-bureau overlap alerts", val: String(metrics.kpi.openOverlapAlerts), warn: true },
    { label: "Hearings scheduled in next 7 days", val: String(heard.filter((h) => !h.isPast).length) },
  ];
  for (const g of glance) {
    page.drawText(`• ${g.label}:`, { x: 50, y, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(g.val, {
      x: 330, y, size: 9, font: fontBold,
      color: g.warn ? rgb(0.85, 0.1, 0.1) : rgb(0.04, 0.15, 0.25),
    });
    y -= 16;
  }

  // 2 — Bureau scorecard
  y -= 14;
  section("2. BUREAU SCORECARD (STATUTORY PERFORMANCE)");
  page.drawRectangle({ x: 40, y: y - 5, width: 515, height: 18, color: rgb(0.93, 0.95, 0.98) });
  page.drawText("Bureau", { x: 45, y, size: 8, font: fontBold, color: rgb(0.1, 0.2, 0.3) });
  page.drawText("Open", { x: 205, y, size: 8, font: fontBold, color: rgb(0.1, 0.2, 0.3) });
  page.drawText("Disposal %", { x: 250, y, size: 8, font: fontBold, color: rgb(0.1, 0.2, 0.3) });
  page.drawText("On-time %", { x: 315, y, size: 8, font: fontBold, color: rgb(0.1, 0.2, 0.3) });
  page.drawText("Breached", { x: 378, y, size: 8, font: fontBold, color: rgb(0.1, 0.2, 0.3) });
  page.drawText("Oldest (d)", { x: 440, y, size: 8, font: fontBold, color: rgb(0.1, 0.2, 0.3) });
  page.drawText("Grade", { x: 512, y, size: 8, font: fontBold, color: rgb(0.1, 0.2, 0.3) });
  y -= 18;

  for (const row of scorecard) {
    const open = row.pending + row.underProcess + row.escalated;
    page.drawText(escapePdf((BUREAU_LABEL[row.bureau] ?? row.bureau).slice(0, 26)), {
      x: 45, y, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(String(open), { x: 210, y, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(`${row.disposalRatePercent}%`, { x: 258, y, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(`${row.onTimeRatePercent}%`, { x: 324, y, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(String(row.beyondTimeline), {
      x: 382, y, size: 8, font: fontRegular,
      color: row.beyondTimeline > 0 ? rgb(0.85, 0.1, 0.1) : rgb(0.1, 0.6, 0.3),
    });
    page.drawText(String(row.oldestActiveDays), { x: 448, y, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(row.grade, {
      x: 516, y, size: 8, font: fontBold,
      color: row.grade === "A" ? rgb(0.1, 0.6, 0.3) : row.grade === "D" ? rgb(0.85, 0.1, 0.1) : rgb(0.7, 0.45, 0.05),
    });
    page.drawLine({ start: { x: 40, y: y - 4 }, end: { x: 555, y: y - 4 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
    y -= 16;
  }

  // 3 — Hearing board
  y -= 12;
  section("3. HEARING BOARD / NEXT 7 DAYS");
  const upcoming = heard.filter((h) => !h.isPast).slice(0, 8);
  if (upcoming.length === 0) {
    page.drawText("No statutory hearings scheduled in the next seven days.", {
      x: 50, y, size: 9, font: fontRegular, color: rgb(0.35, 0.35, 0.35),
    });
    y -= 16;
  } else {
    for (const h of upcoming) {
      const date = h.hearing_date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      const line = `${date}  |  ${h.case_id}  |  ${escapePdf(h.institution_name)} (${escapePdf(h.city)})  |  ${escapePdf(BUREAU_LABEL[h.assigned_bureau] ?? h.assigned_bureau)}`;
      page.drawText(line.slice(0, 118), {
        x: 50, y, size: 8.5, font: fontRegular,
        color: h.sla_status.isBreached ? rgb(0.7, 0.08, 0.08) : rgb(0.2, 0.2, 0.2),
      });
      y -= 15;
    }
  }

  // 4 — Recurrence watch
  y -= 8;
  section("4. RECURRING COMPLAINANT WATCH");
  page.drawText(
    `Prolific identities (${RECUR_THRESHOLDS.prolific}+ files): ${prolific.length}   ·   Repeat identities (3-4 files): ${repeat.length}`,
    { x: 50, y, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) }
  );
  y -= 16;
  for (const p of [...prolific, ...repeat].slice(0, 4)) {
    const inst = p.institutions.length > 1 ? `${p.institutions.length} institutions` : (p.institutions[0] ?? "");
    page.drawText(
      `• ${escapePdf(p.name)} — ${p.totalCases} files (${p.openCases} open) across ${p.bureaus.length} bureau(s); ${escapePdf(inst.slice(0, 60))}`,
      { x: 50, y, size: 8.5, font: fontRegular, color: p.level === "PROLIFIC" ? rgb(0.6, 0.08, 0.08) : rgb(0.2, 0.2, 0.2) }
    );
    y -= 15;
  }

  // Regulatory note
  y -= 10;
  page.drawText(
    "Digest compiled automatically by the AICTE Integrated Complaint Monitoring Dashboard. Figures reconcile with the live dashboard and the SLA engine; scorecard grading blends on-time disposal with open breach load.",
    { x: 40, y, size: 7.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4), maxWidth: 515, lineHeight: 11 }
  );

  page.drawLine({ start: { x: 40, y: 35 }, end: { x: 555, y: 35 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  page.drawText("Confidential • AICTE Government of India Official Document • Unauthorized Reproduction Prohibited", {
    x: 40, y: 22, size: 7, font: fontRegular, color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="aicte_weekly_digest_${now.toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
