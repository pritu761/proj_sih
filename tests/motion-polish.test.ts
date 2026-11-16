import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime } from "@/lib/utils";

/**
 * The dashboard's demo locale is IST. Pinning Asia/Kolkata in the shared
 * formatters keeps SSR (UTC) and browser output identical around midnight.
 */
describe("timezone-neutral date formatting", () => {
  it("anchors formatDate to Asia/Kolkata across the IST day boundary", () => {
    // 18:29 UTC is still 16 Nov in IST; 18:30 UTC is already 17 Nov in IST.
    expect(formatDate("2026-11-16T18:29:59.000Z")).toBe("16 Nov 2026");
    expect(formatDate("2026-11-16T18:30:00.000Z")).toBe("17 Nov 2026");
    expect(formatDate("2026-11-17T18:31:00.000Z")).toBe("18 Nov 2026");
  });

  it("renders formatDateTime in IST wall-clock time with a 12-hour clock", () => {
    const formatted = formatDateTime("2026-11-16T18:30:00.000Z");
    expect(formatted).toContain("17 Nov 2026");
    expect(formatted).toContain("12:00");
    expect(formatted.toLowerCase()).toContain("am");
  });

  it("returns a stable dash for missing values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDateTime(null)).toBe("—");
  });
});
