import type { BeerTrackerTransactionQuery } from '@/lib/db';

import { query } from '@/lib/db';

import { planRowFromColumns, type SprintGoalPlanRow } from './sprintGoalPlanRow';

interface SprintGoalRow {
  done: boolean;
  id: string;
  /** Строка квартального плана цели (QG5); null — цель без привязки. */
  planRow: SprintGoalPlanRow | null;
  text: string;
}

const GOAL_COLUMNS = 'id, text, done, plan_year, plan_quarter, plan_row_id';

type PlanRowColumns = Parameters<typeof planRowFromColumns>[0];
type StoredGoalRow = Omit<SprintGoalRow, 'planRow'> & PlanRowColumns;

function goalFromRow<T extends StoredGoalRow>(row: T): Omit<T, keyof PlanRowColumns> & SprintGoalRow {
  const { plan_quarter, plan_row_id, plan_year, ...goal } = row;
  return { ...goal, planRow: planRowFromColumns({ plan_quarter, plan_row_id, plan_year }) };
}

export interface SprintGoalTextRow {
  goal_type: string;
  text: string;
}

export async function listSprintGoals(input: {
  goalType: string;
  organizationId: string;
  sprintId: number;
}): Promise<SprintGoalRow[]> {
  const result = await query(
    `SELECT ${GOAL_COLUMNS}
       FROM sprint_goals
       WHERE organization_id = $1 AND sprint_id = $2 AND goal_type = $3
       ORDER BY created_at ASC`,
    [input.organizationId, input.sprintId, input.goalType]
  );
  return (result.rows as StoredGoalRow[]).map(goalFromRow);
}

/** Все цели спринта (Delivery и Discovery) в порядке создания — для зеркала в трекер. */
export async function listSprintGoalTexts(input: {
  organizationId: string;
  sprintId: number;
}): Promise<SprintGoalTextRow[]> {
  const result = await query(
    `SELECT goal_type, text
       FROM sprint_goals
       WHERE organization_id = $1 AND sprint_id = $2
       ORDER BY created_at ASC`,
    [input.organizationId, input.sprintId]
  );
  return result.rows as SprintGoalTextRow[];
}

export async function insertSprintGoal(
  input: {
    goalId?: string;
    goalType: string;
    organizationId: string;
    planRow?: SprintGoalPlanRow | null;
    sprintId: number;
    team?: string | null;
    text: string;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<SprintGoalRow> {
  const insert = await run(
    `INSERT INTO sprint_goals
             (id, organization_id, sprint_id, team, text, goal_type, done, plan_year, plan_quarter, plan_row_id)
           VALUES (
             COALESCE($1::uuid, gen_random_uuid()), $2, $3,
             -- Без команды (цель от агента) — команда остальных целей спринта, иначе скор
             -- заводит для неё отдельную строку по goal_type.
             COALESCE(
               NULLIF(TRIM(BOTH FROM $4::text), ''),
               (SELECT team FROM sprint_goals
                 WHERE organization_id = $2 AND sprint_id = $3 AND NULLIF(TRIM(BOTH FROM team), '') IS NOT NULL
                 GROUP BY team ORDER BY COUNT(*) DESC, team LIMIT 1)
             ),
             $5, $6, false, $7, $8, $9)
           RETURNING ${GOAL_COLUMNS}`,
    [
      input.goalId ?? null,
      input.organizationId,
      input.sprintId,
      input.team ?? null,
      input.text,
      input.goalType,
      input.planRow?.year ?? null,
      input.planRow?.quarter ?? null,
      input.planRow?.rowId ?? null,
    ]
  );
  return goalFromRow(insert.rows[0] as StoredGoalRow);
}

/** Что меняется у цели; полей, которых нет, правка не трогает. `planRow: null` снимает привязку. */
export interface SprintGoalPatch {
  done?: boolean;
  planRow?: SprintGoalPlanRow | null;
  text?: string;
}

export async function updateSprintGoal(
  input: {
    goalId: string;
    organizationId: string;
    patch: SprintGoalPatch;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<(SprintGoalRow & { sprint_id: number }) | null> {
  const { done, planRow, text } = input.patch;
  const columns: Array<[string, boolean | number | string | null]> = [];
  if (text !== undefined) columns.push(['text', text]);
  if (done !== undefined) columns.push(['done', done]);
  if (planRow !== undefined) {
    columns.push(
      ['plan_year', planRow?.year ?? null],
      ['plan_quarter', planRow?.quarter ?? null],
      ['plan_row_id', planRow?.rowId ?? null]
    );
  }
  // Пустая правка ничего не меняет, но цель возвращает — как и раньше, когда вызывающий не прислал полей.
  const assignments = columns.length > 0 ? columns.map(([column], index) => `${column} = $${index + 1}`) : ['text = text'];
  const result = await run(
    `UPDATE sprint_goals
       SET ${assignments.join(', ')}
       WHERE id = $${columns.length + 1} AND organization_id = $${columns.length + 2}
       RETURNING ${GOAL_COLUMNS}, sprint_id`,
    [...columns.map(([, value]) => value), input.goalId, input.organizationId]
  );
  const row = result.rows[0] as (StoredGoalRow & { sprint_id: number }) | undefined;
  return row ? goalFromRow(row) : null;
}

export async function deleteSprintGoal(
  input: {
    goalId: string;
    organizationId: string;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<{ sprintId: number } | null> {
  const result = await run(
    'DELETE FROM sprint_goals WHERE id = $1 AND organization_id = $2 RETURNING sprint_id',
    [input.goalId, input.organizationId]
  );
  const row = result.rows[0] as { sprint_id: number } | undefined;
  return row ? { sprintId: row.sprint_id } : null;
}

export async function sprintGoalExists(input: { goalId: string; organizationId: string }): Promise<boolean> {
  const result = await query(
    'SELECT 1 FROM sprint_goals WHERE id = $1 AND organization_id = $2 LIMIT 1',
    [input.goalId, input.organizationId]
  );
  return result.rows.length > 0;
}

/** Спринт цели организации; null — цели нет. */
export async function fetchSprintGoalSprintId(input: {
  goalId: string;
  organizationId: string;
}): Promise<number | null> {
  const result = await query(
    'SELECT sprint_id FROM sprint_goals WHERE id = $1 AND organization_id = $2 LIMIT 1',
    [input.goalId, input.organizationId]
  );
  const row = result.rows[0] as { sprint_id: number } | undefined;
  return row ? Number(row.sprint_id) : null;
}

interface SprintGoalsAggRow {
  goals_done: number;
  goals_total: number;
  team: string;
}

export async function aggregateSprintGoalsByTeam(input: {
  organizationId: string;
  sprintId: number;
}): Promise<SprintGoalsAggRow[]> {
  const result = await query(
    `SELECT
        COALESCE(NULLIF(TRIM(BOTH FROM team), ''), goal_type::text) AS team,
        COUNT(*)::int AS goals_total,
        COALESCE(SUM(CASE WHEN done THEN 1 ELSE 0 END), 0)::int AS goals_done
      FROM sprint_goals
      WHERE organization_id = $1 AND sprint_id = $2
      GROUP BY COALESCE(NULLIF(TRIM(BOTH FROM team), ''), goal_type::text)
      ORDER BY 1 ASC`,
    [input.organizationId, input.sprintId]
  );
  return result.rows as SprintGoalsAggRow[];
}
