import { describe, it, expect } from "vitest";
import { scrollProgress, scrollProgressTransform } from "@/lib/scroll-progress";

describe("scroll progress math", () => {
  it("returns 0 when the document does not scroll", () => {
    expect(scrollProgress(0, 800, 800)).toBe(0);
    expect(scrollProgress(120, 800, 900)).toBe(0);
  });

  it("clamps to the boundaries of the scrollable range", () => {
    expect(scrollProgress(-40, 2000, 1000)).toBe(0);
    expect(scrollProgress(9000, 2000, 1000)).toBe(1);
  });

  it("maps the midpoint of the scrollable area to 0.5", () => {
    expect(scrollProgress(500, 2000, 1000)).toBe(0.5);
  });

  it("guards against non-finite input", () => {
    expect(scrollProgress(NaN, 2000, 1000)).toBe(0);
    expect(scrollProgress(100, Infinity, 1000)).toBe(0);
    expect(scrollProgress(100, 2000, -1)).toBe(0);
  });

  it("produces a stable, clamped transform string", () => {
    expect(scrollProgressTransform(0)).toBe("scaleX(0)");
    expect(scrollProgressTransform(0.5)).toBe("scaleX(0.5)");
    expect(scrollProgressTransform(1.2345)).toBe("scaleX(1)");
    expect(scrollProgressTransform(-2)).toBe("scaleX(0)");
    expect(scrollProgressTransform(0.3333333)).toBe("scaleX(0.333)");
    expect(scrollProgressTransform(Number.NaN)).toBe("scaleX(0)");
  });
});
