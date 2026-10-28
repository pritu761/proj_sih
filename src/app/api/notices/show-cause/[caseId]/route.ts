import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import crypto from "node:crypto";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { SessionUser } from "@/lib/rbac";
import {
  assessInstitutionCompliance,
  getAphClauses,
  replyDeadline,
  showCauseReference,
} from "@/lib/services/aph-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 44;
const NAVY = rgb(0.035, 0.075, 0.15);
const GOLD = rgb(0.98, 0.75, 0.18);
const INK = rgb(0.1, 0.13, 0.19);
const MUTED = rgb(0.38, 0.42, 0.5);
const RED = rgb(0.78, 0.1, 0.18);
const GREEN = rgb(0.05, 0.45, 0.32);

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as unknown as SessionUser;
  const { caseId } = await context.params;
  const data = await repository.getCaseById(caseId, user);
  if (!data) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const { caseItem, overlapAlert } = data;
  if (!caseItem.institution) {
    return NextResponse.json({ error: "Institution not found" }, { status: 404 });
  }

  const institutionData = await repository.getInstitutionById(
    caseItem.institution.id,
    user
  );
  if (!institutionData) {
    return NextResponse.json({ error: "Institution not found" }, { status: 404 });
  }

  const assessment = assessInstitutionCompliance(
    institutionData.institution,
    institutionData.cases,
    institutionData.overlapAlerts
  );
  const clauses = getAphClauses(caseItem.category);
  const reference = showCauseReference(caseItem.case_id);
  const deadline = replyDeadline(15);
  const issuedOn = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const documents: string[] = ["Governing Body resolution authorising the reply"];
  if (caseItem.category === "Capitation Fee & Overcharging") {
    documents.push(
      "Audited fee ledger, trust bank statements and receipts for the last two academic years"
    );
  }
  if (caseItem.category === "Faculty Non-Payment & Harassment") {
    documents.push("Payroll register, 7th CPC arrears computation and EPF/ESI challans");
  }
  if (
    caseItem.category === "Unapproved Courses & Seats" ||
    caseItem.category === "Admission Irregularities"
  ) {
    documents.push(
      "Approved intake matrix, admission register and counselling allotment records"
    );
  }
  if (caseItem.category === "Ragging & Safety Violations") {
    documents.push(
      "Anti-ragging committee minutes, police complaint/FIR and fire-safety certificates"
    );
  }
  if (caseItem.category === "Withholding Certificates") {
    documents.push("Certificate issue register and list of pending original documents");
  }
  if (caseItem.category === "Infrastructure & Lab Deficiencies") {
    documents.push("Laboratory equipment register and current facility compliance plan");
  }
  documents.push(
    "Affidavit of the Chairperson confirming that no parallel inquiry is being suppressed"
  );

  const payloadForHash = JSON.stringify({
    reference,
    issuedOn,
    institution: institutionData.institution.aicte_permanent_id,
    case: caseItem.case_id,
    category: caseItem.category,
    score: assessment.score,
    band: assessment.band,
    clauses: clauses.map((c) => c.code),
    deadline,
  });
  const digest = crypto.createHash("sha256").update(payloadForHash).digest("hex");

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let page: PDFPage = pdfDoc.addPage(A4);
  let y = page.getHeight() - MARGIN;

  const write = (
    text: string,
    options: {
      size?: number;
      font?: PDFFont;
      color?: ReturnType<typeof rgb>;
      x?: number;
      leading?: number;
      width?: number;
      gap?: number;
    } = {}
  ) => {
    const size = options.size ?? 9.5;
    const font = options.font ?? fontRegular;
    const color = options.color ?? INK;
    const x = options.x ?? MARGIN;
    const width = options.width ?? page.getWidth() - MARGIN * 2;
    const leading = options.leading ?? size + 3.4;
    const lines = wrapText(text, font, size, width);
    for (const line of lines) {
      if (y < 58) {
        page = pdfDoc.addPage(A4);
        y = page.getHeight() - MARGIN;
      }
      page.drawText(line, { x, y, size, font, color });
      y -= leading;
    }
    y -= options.gap ?? 0;
  };

  const rule = () => {
    if (y < 58) {
      page = pdfDoc.addPage(A4);
      y = page.getHeight() - MARGIN;
    }
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: page.getWidth() - MARGIN, y },
      thickness: 0.6,
      color: rgb(0.86, 0.88, 0.92),
    });
    y -= 12;
  };

  const section = (title: string) => {
    y -= 6;
    write(title, { size: 10.5, font: fontBold, color: NAVY, gap: 2 });
    rule();
  };

  // Letterhead
  page.drawRectangle({
    x: 0,
    y: page.getHeight() - 108,
    width: page.getWidth(),
    height: 108,
    color: NAVY,
  });
  page.drawRectangle({
    x: 0,
    y: page.getHeight() - 108,
    width: 7,
    height: 108,
    color: GOLD,
  });
  page.drawText("ALL INDIA COUNCIL FOR TECHNICAL EDUCATION", {
    x: MARGIN,
    y: page.getHeight() - 40,
    size: 14.5,
    font: fontBold,
    color: GOLD,
  });
  page.drawText("Office of the Competent Authority · Statutory Show-Cause Notice", {
    x: MARGIN,
    y: page.getHeight() - 58,
    size: 10,
    font: fontRegular,
    color: rgb(0.92, 0.94, 0.97),
  });
  page.drawText("Approval Process Handbook 2026-27", {
    x: MARGIN,
    y: page.getHeight() - 78,
    size: 8,
    font: fontRegular,
    color: rgb(0.7, 0.76, 0.84),
  });
  page.drawText("CONFIDENTIAL", {
    x: page.getWidth() - MARGIN - 78,
    y: page.getHeight() - 78,
    size: 8,
    font: fontBold,
    color: rgb(0.99, 0.55, 0.55),
  });

  y = page.getHeight() - 132;

  write(`Ref: ${reference}`, { size: 10, font: fontBold, color: NAVY });
  write(`Date: ${issuedOn}`, { size: 9.5, color: MUTED, gap: 10 });

  write("TO", { size: 8, font: fontBold, color: MUTED });
  write(
    `The Principal / Director\n${institutionData.institution.name}\n${institutionData.institution.address}, ${institutionData.institution.city}, ${institutionData.institution.state} – ${institutionData.institution.pincode}`,
    { size: 10, font: fontBold, gap: 2 }
  );
  write(
    `AICTE Permanent ID: ${institutionData.institution.aicte_permanent_id} · AISHE / Institute ID on record · ${institutionData.institution.institution_type}`,
    { size: 8.5, color: MUTED, gap: 10 }
  );

  write(
    `SUBJECT: Show-cause notice under the AICTE Approval Process Handbook 2026-27 and the AICTE (Grant of Approval to Technical Institutions) Regulations, 2024 in respect of ${caseItem.category}.`,
    { size: 10, font: fontBold, color: NAVY, gap: 8 }
  );

  section("1. PRIMA FACIE FINDING");
  write(
    `The Council has received and examined the representation registered as ${caseItem.case_id} on ${new Date(caseItem.date_received).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} through the ${String(caseItem.source).toUpperCase()} channel. The grievance alleges ${caseItem.category.toLowerCase()} at the institution. On a prima facie examination, the allegations engage the mandatory obligations reproduced in Paragraph 3 below.`,
    { size: 9.5, gap: 4 }
  );
  write(caseItem.description, {
    size: 9,
    font: fontOblique,
    color: rgb(0.24, 0.28, 0.36),
    gap: 8,
  });

  section("2. CASE PARTICULARS");
  const particulars: [string, string][] = [
    ["Case registry", caseItem.case_id],
    [
      "Date of receipt",
      new Date(caseItem.date_received).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    ],
    ["Category", caseItem.category],
    ["Owning bureau", caseItem.assigned_bureau.replaceAll("_", " ")],
    ["Priority", caseItem.priority],
    [
      "Statutory timeline",
      `${caseItem.sla?.timelineDays ?? 30} days · ${
        caseItem.sla?.isBreached
          ? `BREACHED by ${Math.abs(caseItem.sla.remainingDays)} days`
          : `${caseItem.sla?.remainingDays ?? 0} days remaining`
      }`,
    ],
    [
      "Parallel inquiry",
      overlapAlert
        ? `OPEN collision ${overlapAlert.id} with ${overlapAlert.case_ids
            .filter((c: string) => c !== caseItem.case_id)
            .join(", ")}`
        : "No open collision at the time of issue",
    ],
  ];
  for (const [label, value] of particulars) {
    if (y < 70) {
      page = pdfDoc.addPage(A4);
      y = page.getHeight() - MARGIN;
    }
    page.drawText(label, {
      x: MARGIN,
      y,
      size: 8.5,
      font: fontBold,
      color: MUTED,
    });
    const lines = wrapText(value, fontRegular, 9, 330);
    page.drawText(lines[0] ?? "", {
      x: MARGIN + 150,
      y,
      size: 9,
      font: fontRegular,
      color: INK,
    });
    y -= 14;
    for (const extra of lines.slice(1)) {
      page.drawText(extra, {
        x: MARGIN + 150,
        y,
        size: 9,
        font: fontRegular,
        color: INK,
      });
      y -= 12;
    }
  }
  y -= 6;

  section("3. APH CLAUSES ENGAGED");
  clauses.forEach((clause, index) => {
    write(`${index + 1}. ${clause.code} — ${clause.title}`, {
      size: 9.5,
      font: fontBold,
      color: NAVY,
      gap: 1,
    });
    write(clause.chapter, { size: 8, font: fontOblique, color: MUTED, gap: 1 });
    write(clause.requirement, { size: 9, gap: 2 });
    write(`Consequence of non-compliance: ${clause.consequence}`, {
      size: 8.5,
      color: RED,
      gap: 5,
    });
  });

  if (assessment.aphClauses.length > clauses.length) {
    const additional = assessment.aphClauses
      .filter((c) => !clauses.some((x) => x.code === c.code))
      .map((c) => `${c.code} (${c.title})`)
      .join("; ");
    write(`Institutional record also engages: ${additional}.`, {
      size: 8.5,
      color: MUTED,
      gap: 4,
    });
  }

  section("4. INSTITUTIONAL COMPLIANCE RISK");
  write(
    `Assessed compliance-risk score: ${assessment.score}/100 — ${assessment.band} (${assessment.bandLabel}). The score is a deterministic composite of live complaint load, SLA breaches, parallel bureau inquiries, repeat-category behaviour and the regulatory nature of the allegations.`,
    { size: 9.5, gap: 3 }
  );
  assessment.drivers.slice(0, 6).forEach((driver) => {
    write(`• ${driver.label} (+${driver.points}) — ${driver.detail}`, {
      size: 8.8,
      gap: 1,
    });
  });
  y -= 3;
  write(
    `${assessment.eoa.flag ? "EoA FLAG: " + assessment.eoa.headline : "EoA: " + assessment.eoa.headline}. ${assessment.evc.flag ? "EVC FLAG: " + assessment.evc.headline + "." : "EVC: " + assessment.evc.headline + "."}`,
    { size: 8.8, font: fontBold, color: assessment.eoa.flag ? RED : GREEN, gap: 6 }
  );

  section("5. DIRECTION");
  write(
    `You are hereby directed to show cause, in writing, why action should not be taken against the institution under the APH and the Grant of Approval Regulations. A duly signed reply, along with the documents listed below, must reach the Competent Authority on or before ${deadline} (15 days from the date of this notice).`,
    { size: 9.5, gap: 3 }
  );
  documents.forEach((doc, index) => {
    write(`${index + 1}. ${doc}`, { size: 8.9, gap: 1 });
  });
  y -= 4;
  write(
    "Failure to reply within the stipulated period will be treated as an admission of the facts, and the Council may proceed ex parte, including placing the Extension of Approval under scrutiny, constituting an Expert Visit Committee, reducing the approved intake, or initiating penalty proceedings. The institution shall not take any coercive action against the complainant or withhold any original document during the pendency of this notice.",
    { size: 9, color: RED, gap: 10 }
  );

  section("6. AUDIT CERTIFICATION");
  write(
    "This notice was generated from the AICTE Sentinel single source of truth. The SHA-256 digest below binds the notice to the case record, compliance score and APH clauses in force at the time of issue.",
    { size: 8.8, color: MUTED, gap: 2 }
  );
  write(`SHA-256: ${digest}`, { size: 7.4, color: NAVY, gap: 2 });
  write(
    `Generated by ${user.name} (${user.email}) · ${user.designation ?? user.role} · ${new Date().toISOString()}`,
    { size: 7.4, color: MUTED, gap: 12 }
  );

  y -= 4;
  if (y < 110) {
    page = pdfDoc.addPage(A4);
    y = page.getHeight() - MARGIN;
  }
  write("(Authorised Signatory)", { size: 9, font: fontBold, gap: 1 });
  write("Competent Authority, AICTE", { size: 9, gap: 1 });
  write("Copy to: Regulation Bureau · PGRC · Approval Bureau · Institution compliance file", {
    size: 7.6,
    font: fontOblique,
    color: MUTED,
    gap: 1,
  });

  const pages = pdfDoc.getPages();
  pages.forEach((p, index) => {
    p.drawLine({
      start: { x: MARGIN, y: 40 },
      end: { x: p.getWidth() - MARGIN, y: 40 },
      thickness: 0.5,
      color: rgb(0.82, 0.84, 0.88),
    });
    p.drawText(
      "AICTE Sentinel · Statutory Show-Cause Notice · Confidential Government of India document",
      { x: MARGIN, y: 27, size: 6.8, font: fontRegular, color: MUTED }
    );
    p.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: p.getWidth() - MARGIN - 50,
      y: 27,
      size: 6.8,
      font: fontRegular,
      color: MUTED,
    });
  });

  const pdfBytes = await pdfDoc.save();
  const filename = `Show-Cause-${caseItem.case_id.replace(/\//g, "-")}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Notice-SHA256": digest,
    },
  });
}
