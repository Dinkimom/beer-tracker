import { describe, expect, it } from "vitest";

import {
  filterPlatformMappingRows,
  summarizePlatformMappingRows,
} from "./platformMappingFilter";

const rows = [
  { changed: false, trackerValue: "a", unmapped: true },
  { changed: true, trackerValue: "b", unmapped: false },
  { changed: false, trackerValue: "c", unmapped: false },
];

describe("filterPlatformMappingRows", () => {
  it("returns all rows for filter all", () => {
    expect(filterPlatformMappingRows(rows, "all")).toEqual(rows);
  });

  it("filters unmapped only for problematic", () => {
    expect(filterPlatformMappingRows(rows, "problematic")).toEqual([rows[0]]);
  });

  it("filters changed only for changed", () => {
    expect(filterPlatformMappingRows(rows, "changed")).toEqual([rows[1]]);
  });
});

describe("summarizePlatformMappingRows", () => {
  it("counts totals", () => {
    expect(summarizePlatformMappingRows(rows)).toEqual({
      changed: 1,
      total: 3,
      unmapped: 1,
    });
  });

  it("handles empty", () => {
    expect(summarizePlatformMappingRows([])).toEqual({
      changed: 0,
      total: 0,
      unmapped: 0,
    });
  });

  it("counts row that is both unmapped and changed", () => {
    const both = [{ changed: true, unmapped: true }];
    expect(summarizePlatformMappingRows(both)).toEqual({
      changed: 1,
      total: 1,
      unmapped: 1,
    });
  });
});
