import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { SessionUser } from "@/lib/rbac";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as unknown as SessionUser;
  const metrics = await repository.getDashboardMetrics(user);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions in points
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Deep Navy Header Banner
  page.drawRectangle({
    x: 0,
    y: height - 90,
    width: width,
    height: 90,
    color: rgb(0.04, 0.15, 0.25), // #0A2540
  });

  // Header Title
  page.drawText("ALL INDIA COUNCIL FOR TECHNICAL EDUCATION", {
    x: 40,
    y: height - 42,
    size: 14,
    font: fontBold,
    color: rgb(1, 0.78, 0.2), // Gold
  });

  page.drawText("Central Complaint Monitoring & Status Summary Report", {
    x: 40,
    y: height - 60,
    size: 11,
    font: fontRegular,
    color: rgb(1, 1, 1),
  });

  const generatedDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  page.drawText(`Generated on: ${generatedDate} | Authorized User: ${user.name} (${user.role})`, {
    x: 40,
    y: height - 80,
    size: 8,
    font: fontRegular,
    color: rgb(0.8, 0.85, 0.9),
  });

  // Section 1: Executive KPI Summary Box
  page.drawText("1. EXECUTIVE GRIEVANCE & SLA SUMMARY", {
    x: 40,
    y: height - 125,
    size: 11,
    font: fontBold,
    color: rgb(0.04, 0.15, 0.25),
  });

  const kpis = [
    { label: "Total Complaints Received", val: String(metrics.kpi.totalReceived) },
    { label: "Currently Under Process", val: String(metrics.kpi.underProcess) },
    { label: "Successfully Disposed", val: String(metrics.kpi.disposed) },
    { label: "Pending Scrutiny", val: String(metrics.kpi.pending) },
    { label: "Breached SLA Timeline", val: String(metrics.kpi.pendingBeyondTimeline) },
    { label: "Active Overlap Alerts", val: String(metrics.kpi.openOverlapAlerts) },
  ];

  let kpiY = height - 150;
  for (let i = 0; i < kpis.length; i += 2) {
    const k1 = kpis[i];
    const k2 = kpis[i + 1];

    page.drawText(`• ${k1.label}:`, { x: 50, y: kpiY, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(k1.val, { x: 230, y: kpiY, size: 9, font: fontBold, color: rgb(0.04, 0.15, 0.25) });

    if (k2) {
      page.drawText(`• ${k2.label}:`, { x: 300, y: kpiY, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(k2.val, {
        x: 480,
        y: kpiY,
        size: 9,
        font: fontBold,
        color: k2.label.includes("Breached") || k2.label.includes("Overlap") ? rgb(0.85, 0.1, 0.1) : rgb(0.04, 0.15, 0.25),
      });
    }
    kpiY -= 20;
  }

  // Section 2: Bureau-Wise Workload Table
  let tableY = kpiY - 25;
  page.drawText("2. BUREAU / CELL-WISE WORKLOAD ALLOCATION", {
    x: 40,
    y: tableY,
    size: 11,
    font: fontBold,
    color: rgb(0.04, 0.15, 0.25),
  });

  tableY -= 20;
  // Table Header
  page.drawRectangle({
    x: 40,
    y: tableY - 5,
    width: 515,
    height: 18,
    color: rgb(0.93, 0.95, 0.98),
  });

  page.drawText("Bureau / Cell", { x: 45, y: tableY, size: 8, font: fontBold, color: rgb(0.1, 0.2, 0.3) });
  page.drawText("Pending", { x: 220, y: tableY, size: 8, font: fontBold, color: rgb(0.1, 0.2, 0.3) });
  page.drawText("Under Process", { x: 290, y: tableY, size: 8, font: fontBold, color: rgb(0.1, 0.2, 0.3) });
  page.drawText("Disposed", { x: 380, y: tableY, size: 8, font: fontBold, color: rgb(0.1, 0.2, 0.3) });
  page.drawText("Total Caseload", { x: 450, y: tableY, size: 8, font: fontBold, color: rgb(0.1, 0.2, 0.3) });

  tableY -= 18;
  for (const b of metrics.bureauWorkload) {
    page.drawText(b.bureau, { x: 45, y: tableY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(String(b.pending), { x: 225, y: tableY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(String(b.underProcess), { x: 300, y: tableY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(String(b.disposed), { x: 390, y: tableY, size: 8, font: fontRegular, color: rgb(0.1, 0.6, 0.3) });
    page.drawText(String(b.total), { x: 460, y: tableY, size: 8, font: fontBold, color: rgb(0.04, 0.15, 0.25) });

    page.drawLine({
      start: { x: 40, y: tableY - 4 },
      end: { x: 555, y: tableY - 4 },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9),
    });
    tableY -= 16;
  }

  // Section 3: Pending Case Ageing
  tableY -= 20;
  page.drawText("3. PENDING CASE AGEING DISTRIBUTION", {
    x: 40,
    y: tableY,
    size: 11,
    font: fontBold,
    color: rgb(0.04, 0.15, 0.25),
  });

  tableY -= 18;
  const ageing = [
    `0 - 15 Days: ${metrics.ageingBuckets.bucket_0_15} cases (Normal)`,
    `16 - 30 Days: ${metrics.ageingBuckets.bucket_16_30} cases (Scrutiny Active)`,
    `31 - 60 Days: ${metrics.ageingBuckets.bucket_31_60} cases (Warning Threshold)`,
    `60+ Days: ${metrics.ageingBuckets.bucket_60_plus} cases (Urgent Escalation)`,
  ];

  for (const a of ageing) {
    page.drawText(`• ${a}`, {
      x: 50,
      y: tableY,
      size: 9,
      font: fontRegular,
      color: a.includes("60+") ? rgb(0.8, 0.1, 0.1) : rgb(0.2, 0.2, 0.2),
    });
    tableY -= 16;
  }

  // Section 4: AICTE Legal & Regulatory Compliance Note
  tableY -= 20;
  page.drawText("4. REGULATORY MANDATE", {
    x: 40,
    y: tableY,
    size: 11,
    font: fontBold,
    color: rgb(0.04, 0.15, 0.25),
  });

  tableY -= 15;
  const note =
    "This report is generated directly by the AICTE Integrated Complaint Monitoring Dashboard as a single source of truth under the AICTE (Establishment of Mechanism for Grievance Redressal) Regulations. Cross-bureau overlap detections require immediate joint coordination by the respective Bureau Heads.";

  page.drawText(note, {
    x: 40,
    y: tableY,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
    maxWidth: 515,
    lineHeight: 11,
  });

  // Footer
  page.drawLine({
    start: { x: 40, y: 35 },
    end: { x: 555, y: 35 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText("Confidential • AICTE Government of India Official Document • Unauthorized Reproduction Prohibited", {
    x: 40,
    y: 22,
    size: 7,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="aicte_executive_report_${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
