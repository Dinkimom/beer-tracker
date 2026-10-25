/**
 * Хранение метрик спринтов: факты по задачам на (доска, спринт).
 */

import type { SprintGoalsTally, SprintIssueFact, SprintMetricsRecord } from './sprintMetricsTypes';

import { query } from '@/lib/db';

import { SPRINT_METRICS_FORMULA_VERSION } from './sprintMetricsTypes';

interface SprintMetricsRow {
  computed_at: string;
  end_date: string;
  facts: unknown;
  frozen: boolean;
  open: boolean;
  sprint_id: number;
  sprint_name: string;
  start_date: string;
}

export type StoredSprintMetrics = Omit<SprintMetricsRecord, 'goals'>;

function rowToStored(row: SprintMetricsRow): StoredSprintMetrics {
  return {
    computedAt: row.computed_at,
    endDate: row.end_date,
    facts: Array.isArray(row.facts) ? (row.facts as SprintIssueFact[]) : [],
    frozen: row.frozen,
    name: row.sprint_name,
    open: row.open,
    sprintId: row.sprint_id,
    startDate: row.start_date,
  };
}

/** Сохранённые записи текущей версии формулы (устаревшие считаются отсутствующими). */
export async function listStoredSprintMetrics(input: {
  boardId: number;
  organizationId: string;
  sprintIds: number[];
}): Promise<Map<number, StoredSprintMetrics>> {
  if (input.sprintIds.length === 0) return new Map();
  const result = await query<SprintMetricsRow>(
    `SELECT sprint_id, sprint_name, start_date, end_date, open, frozen, facts,
            computed_at::text AS computed_at
       FROM sprint_metrics
      WHERE organization_id = $1 AND board_id = $2 AND sprint_id = ANY($3::int[])
        AND formula_version = $4`,
    [input.organizationId, input.boardId, input.sprintIds, SPRINT_METRICS_FORMULA_VERSION]
  );
  return new Map(result.rows.map((row) => [row.sprint_id, rowToStored(row)]));
}

export async function upsertSprintMetrics(input: {
  boardId: number;
  organizationId: string;
  record: StoredSprintMetrics;
}): Promise<void> {
  const { record } = input;
  await query(
    `INSERT INTO sprint_metrics
       (organization_id, board_id, sprint_id, sprint_name, start_date, end_date, open, frozen,
        formula_version, facts, computed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, CURRENT_TIMESTAMP)
     ON CONFLICT (organization_id, board_id, sprint_id) DO UPDATE SET
       sprint_name = EXCLUDED.sprint_name,
       start_date = EXCLUDED.start_date,
       end_date = EXCLUDED.end_date,
       open = EXCLUDED.open,
       frozen = EXCLUDED.frozen,
       formula_version = EXCLUDED.formula_version,
       facts = EXCLUDED.facts,
       computed_at = CURRENT_TIMESTAMP`,
    [
      input.organizationId,
      input.boardId,
      record.sprintId,
      record.name,
      record.startDate,
      record.endDate,
      record.open,
      record.frozen,
      SPRINT_METRICS_FORMULA_VERSION,
      JSON.stringify(record.facts),
    ]
  );
}

/** Цели спринтов: сделано / всего по каждому спринту. */
export async function tallySprintGoals(input: {
  organizationId: string;
  sprintIds: number[];
}): Promise<Map<number, SprintGoalsTally>> {
  if (input.sprintIds.length === 0) return new Map();
  const result = await query<{ done: number; sprint_id: number; total: number }>(
    `SELECT sprint_id,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE done)::int AS done
       FROM sprint_goals
      WHERE organization_id = $1 AND sprint_id = ANY($2::int[])
      GROUP BY sprint_id`,
    [input.organizationId, input.sprintIds]
  );
  return new Map(result.rows.map((row) => [row.sprint_id, { done: row.done, total: row.total }]));
}
