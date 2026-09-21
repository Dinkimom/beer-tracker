import type { SprintScoreRow } from '@/lib/api/types';

export interface QuarterlySprintScoreEntry {
  mark: number;
  markEmoji: string;
  rows: SprintScoreRow[];
}

export function sortSprintScoreRows(rows: SprintScoreRow[]): SprintScoreRow[] {
  return [...rows].sort(
    (a, b) => b.mark - a.mark || a.sname.localeCompare(b.sname, 'ru')
  );
}

export function pickQuarterlySprintScoreEntry(
  rows: SprintScoreRow[]
): QuarterlySprintScoreEntry | undefined {
  if (rows.length === 0) return undefined;
  const sorted = sortSprintScoreRows(rows);
  const top = sorted[0];
  return {
    mark: top.mark,
    markEmoji: top.mark_emoji,
    rows: sorted,
  };
}
