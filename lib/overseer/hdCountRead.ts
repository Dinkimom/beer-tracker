import type { Task } from '@/types';

import { query } from '@/lib/db';
import { parseSlaPriority } from '@/lib/slaBugs/parseSlaBugFields';
import { resolveLastHdAt } from '@/lib/slaBugs/slaBugMetrics';

interface OverseerHdCountSnapshot {
  hdCount: number;
  hdGrowth7d: number;
  hdGrowth24h: number;
  incidentSeverity?: string;
  lastHdAt?: string;
}

type SqlNumericField = number | string | null;

interface HdCountNumericField {
  hd_count: SqlNumericField;
  hd_growth_7d: SqlNumericField;
  hd_growth_24h: SqlNumericField;
}

interface HdCountQueryRow extends HdCountNumericField {
  incident_severity: string | null;
  issue_key: string;
  last_hd_at: Date | string | null;
}

const HD_COUNT_CHUNK_SIZE = 200;

function toInt(v: number | string | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function toIsoString(v: Date | string | null | undefined): string | undefined {
  if (v == null) {
    return undefined;
  }
  if (v instanceof Date) {
    return v.toISOString();
  }
  const trimmed = String(v).trim();
  if (!trimmed) {
    return undefined;
  }
  const ms = Date.parse(trimmed);
  return Number.isNaN(ms) ? trimmed : new Date(ms).toISOString();
}

function mapHdCountRow(row: HdCountQueryRow): [string, OverseerHdCountSnapshot] {
  const incidentSeverity = row.incident_severity?.trim() || undefined;
  return [
    row.issue_key,
    {
      hdCount: toInt(row.hd_count),
      hdGrowth24h: toInt(row.hd_growth_24h),
      hdGrowth7d: toInt(row.hd_growth_7d),
      incidentSeverity,
      lastHdAt: toIsoString(row.last_hd_at),
    },
  ];
}

const HD_COUNT_SNAPSHOT_SQL = `
  WITH filtered AS (
    SELECT
      issue_key,
      issue_hd_count_now,
      incident_severity,
      hd_count,
      hd_count_delta,
      updated_at
    FROM overseer.mv_ytracker_hd_count_changelog_events
    WHERE issue_key = ANY($1::text[])
  ),
  current AS (
    SELECT DISTINCT ON (issue_key)
      issue_key,
      COALESCE(issue_hd_count_now, hd_count, 0) AS hd_count,
      incident_severity
    FROM filtered
    ORDER BY issue_key, updated_at DESC NULLS LAST
  ),
  last_increase AS (
    SELECT DISTINCT ON (issue_key)
      issue_key,
      updated_at AS last_hd_at
    FROM filtered
    WHERE COALESCE(hd_count_delta, 0) > 0
    ORDER BY issue_key, updated_at DESC NULLS LAST
  ),
  growth_24h AS (
    SELECT
      issue_key,
      COALESCE(SUM(hd_count_delta), 0) AS hd_growth_24h
    FROM filtered
    WHERE COALESCE(hd_count_delta, 0) > 0
      AND updated_at >= NOW() - INTERVAL '24 hours'
    GROUP BY issue_key
  ),
  growth_7d AS (
    SELECT
      issue_key,
      COALESCE(SUM(hd_count_delta), 0) AS hd_growth_7d
    FROM filtered
    WHERE COALESCE(hd_count_delta, 0) > 0
      AND updated_at >= NOW() - INTERVAL '7 days'
    GROUP BY issue_key
  )
  SELECT
    c.issue_key,
    c.hd_count,
    c.incident_severity,
    COALESCE(g24.hd_growth_24h, 0) AS hd_growth_24h,
    COALESCE(g7.hd_growth_7d, 0) AS hd_growth_7d,
    li.last_hd_at
  FROM current c
  LEFT JOIN growth_24h g24 ON g24.issue_key = c.issue_key
  LEFT JOIN growth_7d g7 ON g7.issue_key = c.issue_key
  LEFT JOIN last_increase li ON li.issue_key = c.issue_key
`;

async function fetchHdCountSnapshotsChunk(issueKeys: string[]): Promise<Map<string, OverseerHdCountSnapshot>> {
  const map = new Map<string, OverseerHdCountSnapshot>();
  if (issueKeys.length === 0) {
    return map;
  }
  const res = await query<HdCountQueryRow>(HD_COUNT_SNAPSHOT_SQL, [issueKeys]);
  for (const row of res.rows) {
    const [key, snapshot] = mapHdCountRow(row);
    map.set(key, snapshot);
  }
  return map;
}

/**
 * HD-метрики из overseer.mv_ytracker_hd_count_changelog_events по ключам задач.
 */
async function fetchHdCountSnapshotsByIssueKeys(
  issueKeys: string[]
): Promise<Map<string, OverseerHdCountSnapshot>> {
  const unique = [...new Set(issueKeys.map((k) => k.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return new Map();
  }

  const map = new Map<string, OverseerHdCountSnapshot>();
  for (let i = 0; i < unique.length; i += HD_COUNT_CHUNK_SIZE) {
    const chunk = unique.slice(i, i + HD_COUNT_CHUNK_SIZE);
    const chunkMap = await fetchHdCountSnapshotsChunk(chunk);
    for (const [key, snapshot] of chunkMap.entries()) {
      map.set(key, snapshot);
    }
  }
  return map;
}

export function applyOverseerHdCountToTask(
  task: Task,
  snapshot: OverseerHdCountSnapshot | undefined
): Task {
  if (!snapshot) {
    return task;
  }
  const trackerPriority = parseSlaPriority(task.incidentSeverity);
  const overseerPriority = parseSlaPriority(snapshot.incidentSeverity);
  let incidentSeverity = task.incidentSeverity;
  if (trackerPriority == null) {
    if (overseerPriority != null) {
      incidentSeverity = overseerPriority;
    } else {
      incidentSeverity = snapshot.incidentSeverity?.trim() || task.incidentSeverity;
    }
  }

  return {
    ...task,
    hdCount: snapshot.hdCount,
    hdGrowth24h: snapshot.hdGrowth24h,
    hdGrowth7d: snapshot.hdGrowth7d,
    lastHdAt: resolveLastHdAt(
      snapshot.hdCount,
      snapshot.lastHdAt ?? task.lastHdAt,
      task.createdAt
    ),
    incidentSeverity,
  };
}

export async function enrichTasksWithOverseerHdCounts(tasks: Task[]): Promise<Task[]> {
  if (tasks.length === 0) {
    return tasks;
  }
  try {
    const snapshots = await fetchHdCountSnapshotsByIssueKeys(tasks.map((t) => t.id));
    return tasks.map((task) => {
      const enriched = applyOverseerHdCountToTask(task, snapshots.get(task.id));
      return {
        ...enriched,
        lastHdAt: resolveLastHdAt(enriched.hdCount ?? 0, enriched.lastHdAt, enriched.createdAt),
      };
    });
  } catch (error) {
    console.warn('[sla-bugs] overseer HD count enrichment failed, using tracker fields', error);
    return tasks;
  }
}
