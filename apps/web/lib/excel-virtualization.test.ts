import { describe, expect, it } from "vitest";
import { columnLabel, visibleRange } from "./excel-virtualization";

describe("Excel grid virtualization", () => {
  it("renders only the visible rows and a small buffer in a large sheet", () => {
    expect(visibleRange(0, 420, 42, 100_000, 8)).toEqual({ start: 0, end: 18 });
    expect(visibleRange(42_000, 420, 42, 100_000, 8)).toEqual({ start: 992, end: 1018 });
  });

  it("clamps a restored scroll offset to the new sheet", () => {
    expect(visibleRange(42_000, 420, 42, 2, 8)).toEqual({ start: 0, end: 2 });
    expect(visibleRange(0, 420, 42, 0, 8)).toEqual({ start: 0, end: 0 });
  });

  it("labels columns beyond Z", () => {
    expect([0, 25, 26, 51, 702].map(columnLabel)).toEqual(["A", "Z", "AA", "AZ", "AAA"]);
  });
});
