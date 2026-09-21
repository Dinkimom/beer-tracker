import type { HdWeeklyHeatmapWeek } from './hdWeeklyHeatmap';

import { query } from '@/lib/db';

interface HdWeeklyQueryRow {
  count: number | string | null;
  week_start: string;
}

const HD_WEEKLY_HEATMAP_SQL = `
  SELECT
    to_char(
      date_trunc('week', updated_at AT TIME ZONE 'UTC')::date,
      'YYYY-MM-DD'
    ) AS week_start,
    COALESCE(SUM(hd_count_delta), 0)::int AS count
  FROM overseer.mv_ytracker_hd_count_changelog_events
  WHERE issue_key = $1
    AND COALESCE(hd_count_delta, 0) > 0
    AND updated_at >= $2::timestamptz
  GROUP BY 1
  ORDER BY 1
`;

function toInt(value: number | string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

export async function fetchHdWeeklyCountsByIssueKey(
  issueKey: string,
  sinceIso: string
): Promise<HdWeeklyHeatmapWeek[]> {
  const res = await query<HdWeeklyQueryRow>(HD_WEEKLY_HEATMAP_SQL, [issueKey, `${sinceIso}T00:00:00.000Z`]);
  return res.rows.map((row) => ({
    weekStart: row.week_start.trim(),
    count: toInt(row.count),
  }));
}
