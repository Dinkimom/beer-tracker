export type PlatformMappingFilter = "all" | "changed" | "problematic";

interface PlatformMappingRowFlags {
  changed: boolean;
  unmapped: boolean;
}

export function filterPlatformMappingRows<T extends PlatformMappingRowFlags>(
  rows: T[],
  filter: PlatformMappingFilter,
): T[] {
  if (filter === "problematic") {
    return rows.filter((r) => r.unmapped);
  }
  if (filter === "changed") {
    return rows.filter((r) => r.changed);
  }
  return rows;
}

export function summarizePlatformMappingRows<T extends PlatformMappingRowFlags>(
  rows: T[],
): { changed: number; total: number; unmapped: number } {
  let unmapped = 0;
  let changed = 0;
  for (const r of rows) {
    if (r.unmapped) {
      unmapped++;
    }
    if (r.changed) {
      changed++;
    }
  }
  return { changed, total: rows.length, unmapped };
}
