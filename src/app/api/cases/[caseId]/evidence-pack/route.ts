import { NextRequest, NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { canViewCase, SessionUser } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const PAGE_WIDTH = 595.28; // A4 in points
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const BOTTOM_LIMIT = 58;

const NAVY = rgb(0.04, 0.15, 0.25);
const GOLD = rgb(1, 0.78, 0.2);
const TEXT = rgb(0.16, 0.18, 0.21);
const MUTED = rgb(0.42, 0.46, 0.51);
const LINE = rgb(0.86, 0.89, 0.93);
const ALERT = rgb(0.82, 0.1, 0.12);

/**
 * pdf-lib's StandardFonts (Helvetica) can only encode WinAnsi. Map the common
 * typographic characters we actually emit, decompose accents, then replace any
 * remaining non-ASCII run (e.g. a Devanagari narrative) with a single "?".
 * Nothing is ever passed to drawText that the font cannot render.
 */
const CHAR_MAP: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201a": "'",
  "\u201b": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u201e": '"',
  "\u201f": '"',
  "\u2013": "-",
  "\u2014": "-",
  "\u2015": "-",
  "\u2022": "-",
  "\u2026": "...",
  "\u00a0": " ",
  "\u20b9": "INR ",
  "\u2265": ">=",
  "\u2264": "<=",
};

function ascii(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x00-\x7F]/g, (ch) => CHAR_MAP[ch] ?? "?")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]+/g, "?")
    .trim();
}

function clip(value: unknown, max = 110): string {
  const s = ascii(value);
  return s.length > max ? `${s.slice(0, max - 3)}...` : s;
}

function formatDate(value: unknown): string {
  if (!value) return "not recorded";
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return "not recorded";
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
}

/** Word wrapping using the embedded font's real glyph widths. */
function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || font.widthOfTextAtSize(candidate, size) <= width) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ caseId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as unknown as SessionUser;
  const { caseId } = await ctx.params;
  const result = await repository.getCaseEvidencePack(caseId, user);

  if (result.status === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (result.status === "not_found") {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  // Defence in depth: re-assert the RBAC decision at the HTTP boundary using
  // the same helper the case pages and other RBAC surfaces use.
  if (
    !canViewCase(user, {
      assigned_bureau: result.data.assignedBureau,
      institution: { region: result.data.institutionRegion },
    })
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pack = result.data;
  const generatedDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let page: PDFPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 110;

  function drawBanner(target: PDFPage) {
    target.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 90,
      width: PAGE_WIDTH,
      height: 90,
      color: NAVY,
    });
    target.drawText("ALL INDIA COUNCIL FOR TECHNICAL EDUCATION", {
      x: MARGIN,
      y: PAGE_HEIGHT - 42,
      size: 14,
      font: fontBold,
      color: GOLD,
    });
    target.drawText("Per-Case Evidence Pack - Grievance File Record", {
      x: MARGIN,
      y: PAGE_HEIGHT - 61,
      size: 11,
      font: fontRegular,
      color: rgb(1, 1, 1),
    });
    target.drawText(
      clip(
        `Generated on: ${generatedDate} | Authorized User: ${user.name} (${user.role})`,
        150
      ),
      {
        x: MARGIN,
        y: PAGE_HEIGHT - 79,
        size: 8,
        font: fontRegular,
        color: rgb(0.8, 0.85, 0.9),
      }
    );
  }

  function drawFooter(target: PDFPage) {
    target.drawLine({
      start: { x: MARGIN, y: 35 },
      end: { x: PAGE_WIDTH - MARGIN, y: 35 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    target.drawText("Confidential - AICTE Government of India official document - Unauthorized reproduction prohibited", {
      x: MARGIN,
      y: 22,
      size: 7,
      font: fontRegular,
      color: MUTED,
      maxWidth: PAGE_WIDTH - MARGIN * 2 - 60,
    });
  }

  drawBanner(page);
  drawFooter(page);

  function addPage() {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawBanner(page);
    drawFooter(page);
    y = PAGE_HEIGHT - 110;
  }

  function ensure(space: number) {
    if (y - space < BOTTOM_LIMIT) addPage();
  }

  function section(title: string) {
    ensure(42);
    y -= 5;
    page.drawText(title, {
      x: MARGIN,
      y,
      size: 11,
      font: fontBold,
      color: NAVY,
    });
    y -= 8;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.6,
      color: LINE,
    });
    y -= 15;
  }

  function keyValue(label: string, value: unknown, alert = false) {
    ensure(17);
    page.drawText(`${label}:`, {
      x: MARGIN + 6,
      y,
      size: 8.5,
      font: fontBold,
      color: rgb(0.24, 0.29, 0.35),
    });
    page.drawText(clip(value), {
      x: MARGIN + 155,
      y,
      size: 8.5,
      font: fontRegular,
      color: alert ? ALERT : TEXT,
      maxWidth: PAGE_WIDTH - MARGIN * 2 - 165,
    });
    y -= 15;
  }

  function paragraph(
    value: unknown,
    opts: {
      size?: number;
      indent?: number;
      width?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
      gap?: number;
    } = {}
  ) {
    const size = opts.size ?? 8.5;
    const font = opts.bold ? fontBold : fontRegular;
    const indent = opts.indent ?? 0;
    const width = opts.width ?? PAGE_WIDTH - MARGIN * 2 - indent;
    const lines = wrapText(ascii(value), font, size, width);
    for (const line of lines) {
      ensure(size + 5);
      page.drawText(line, {
        x: MARGIN + indent,
        y,
        size,
        font,
        color: opts.color ?? TEXT,
      });
      y -= size + 3;
    }
    y -= opts.gap ?? 3;
  }

  function bullet(value: unknown, opts: { color?: ReturnType<typeof rgb> } = {}) {
    ensure(17);
    page.drawText("-", {
      x: MARGIN + 8,
      y,
      size: 8.5,
      font: fontBold,
      color: opts.color ?? NAVY,
    });
    paragraph(value, { indent: 20, width: PAGE_WIDTH - MARGIN * 2 - 24, gap: 2 });
  }

  // ── 1. Case identity ──────────────────────────────────────────────────────
  section("1. CASE IDENTITY & STATUTORY POSITION");
  keyValue("Registry number", pack.registryNumber);
  keyValue("Institution", pack.institutionName);
  keyValue("AICTE permanent ID", pack.institutionAicteId || "not recorded");
  keyValue("Grievance category", pack.category);
  keyValue("Current status", pack.status);
  keyValue("Priority", pack.priority, pack.priority === "CRITICAL" || pack.priority === "HIGH");
  keyValue("Date received", formatDate(pack.receivedDate));
  keyValue("Assigned bureau", pack.assignedBureau);
  keyValue(
    "SLA position",
    `${pack.sla.statusText} (${pack.sla.timelineDays}d window, ${pack.sla.elapsedDays}d elapsed, ${pack.sla.percentElapsed}% used)`,
    pack.sla.isBreached
  );

  // ── 2. Representation ─────────────────────────────────────────────────────
  section("2. GRIEVANCE REPRESENTATION");
  paragraph(pack.description || "No representation recorded.", {
    size: 8.5,
    width: PAGE_WIDTH - MARGIN * 2 - 6,
    indent: 6,
  });

  // ── 3. Timeline ───────────────────────────────────────────────────────────
  section("3. ACTION TIMELINE & VERIFICATION TRAIL");
  if (pack.timeline.length === 0) {
    paragraph("No timeline entries recorded.", { indent: 6 });
  } else {
    for (const entry of pack.timeline) {
      ensure(28);
      paragraph(
        `${formatDate(entry.at)} | ${ascii(entry.type).replaceAll("_", " ")} | ${ascii(entry.actor)}`,
        { bold: true, size: 8.5, indent: 6, gap: 1 }
      );
      if (entry.remarks) {
        paragraph(entry.remarks, { indent: 18, size: 8, color: MUTED, gap: 5 });
      }
    }
  }

  // ── 4. Linked cases ───────────────────────────────────────────────────────
  section("4. LINKED CASES");
  if (pack.linkedCases.length === 0) {
    paragraph("No linked cases recorded.", { indent: 6 });
  } else {
    for (const linked of pack.linkedCases) {
      bullet(
        `${linked.registryNumber} - ${linked.category}${linked.linkType ? ` (${linked.linkType})` : ""}`
      );
    }
  }

  // ── 5. Overlap alerts ─────────────────────────────────────────────────────
  section("5. CROSS-BUREAU OVERLAP ALERTS");
  if (pack.overlapAlerts.length === 0) {
    paragraph("No overlap alerts recorded for this file.", { indent: 6 });
  } else {
    for (const alert of pack.overlapAlerts) {
      bullet(
        `${alert.caseIds.join(" / ")} | ${alert.status} | ${alert.confidence} confidence | detected ${formatDate(alert.detectedAt)}`,
        { color: ALERT }
      );
      if (alert.bureaus.length) {
        paragraph(`Bureaus involved: ${alert.bureaus.join(", ")}`, {
          indent: 20,
          size: 8,
          color: MUTED,
        });
      }
      for (const reason of alert.reasons) {
        paragraph(reason, { indent: 20, size: 8, color: MUTED });
      }
    }
  }

  // ── 6. Audit chain attestation ────────────────────────────────────────────
  section("6. AUDIT CHAIN ATTESTATION");
  if (pack.audit) {
    keyValue("Algorithm", pack.audit.algorithm);
    keyValue("Sealed blocks", pack.audit.count);
    keyValue("Chain integrity", pack.audit.valid ? "VALID" : "BROKEN", !pack.audit.valid);
    keyValue("Sealed at", formatDate(pack.audit.builtAt));
    paragraph("Head hash (SHA-256):", { bold: true, indent: 6, size: 8, gap: 1 });
    paragraph(pack.audit.head, { indent: 6, size: 7.5, color: MUTED });
  } else {
    paragraph("No audit-chain attestation available.", { indent: 6 });
  }

  // ── 7. Citizen feedback ───────────────────────────────────────────────────
  section("7. CITIZEN FEEDBACK - QUALITY OF REDRESSAL");
  if (pack.feedback) {
    keyValue("Rating", `${pack.feedback.rating} / 5`);
    keyValue("Submitted", formatDate(pack.feedback.at));
    paragraph(pack.feedback.comment || "No written comment was added.", {
      indent: 6,
      size: 8.5,
    });
  } else {
    paragraph("No citizen feedback recorded for this file.", { indent: 6 });
  }

  // Page numbers are stamped last, once the total page count is known.
  const pages = pdfDoc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Page ${i + 1} of ${pages.length}`, {
      x: PAGE_WIDTH - MARGIN - 70,
      y: 22,
      size: 7,
      font: fontRegular,
      color: MUTED,
    });
  });

  const pdfBytes = await pdfDoc.save();
  const safeName = ascii(pack.registryNumber).replace(/[^A-Za-z0-9]+/g, "_");

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="aicte_evidence_pack_${safeName}.pdf"`,
    },
  });
}
