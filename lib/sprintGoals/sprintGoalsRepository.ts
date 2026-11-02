import type { BeerTrackerTransactionQuery } from '@/lib/db';

import { query } from '@/lib/db';

interface SprintGoalRow {
  done: boolean;
  id: string;
  text: string;
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
    `SELECT id, text, done
       FROM sprint_goals
       WHERE sprint_id = $1 AND goal_type = $2
       ORDER BY created_at ASC`,
    [input.sprintId, input.goalType]
  );
  return result.rows as SprintGoalRow[];
}

/** Все цели спринта (Delivery и Discovery) в порядке создания — для зеркала в трекер. */
export async function listSprintGoalTexts(input: { sprintId: number }): Promise<SprintGoalTextRow[]> {
  const result = await query(
    `SELECT goal_type, text
       FROM sprint_goals
       WHERE sprint_id = $1
       ORDER BY created_at ASC`,
    [input.sprintId]
  );
  return result.rows as SprintGoalTextRow[];
}

export async function insertSprintGoal(
  input: {
    goalId?: string;
    goalType: string;
    organizationId: string;
    sprintId: number;
    team?: string | null;
    text: string;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<SprintGoalRow> {
  const insert = await run(
    `INSERT INTO sprint_goals (id, organization_id, sprint_id, team, text, goal_type, done)
           VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, false)
           RETURNING id, text, done`,
    [input.goalId ?? null, input.organizationId, input.sprintId, input.team ?? null, input.text, input.goalType]
  );
  return insert.rows[0] as SprintGoalRow;
}

export async function updateSprintGoal(
  input: {
    goalId: string;
    organizationId: string;
    updateFields: string[];
    updateValues: Array<boolean | number | string | null | undefined>;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<(SprintGoalRow & { sprint_id: number }) | null> {
  const { goalId, updateFields, updateValues } = input;
  const paramIndex = updateValues.length + 1;
  const result = await run(
    `UPDATE sprint_goals
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, text, done, sprint_id`,
    [...updateValues, goalId]
  );
  return (result.rows[0] as (SprintGoalRow & { sprint_id: number }) | undefined) ?? null;
}

export async function deleteSprintGoal(
  input: {
    goalId: string;
    organizationId: string;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<{ sprintId: number } | null> {
  const result = await run('DELETE FROM sprint_goals WHERE id = $1 RETURNING sprint_id', [input.goalId]);
  const row = result.rows[0] as { sprint_id: number } | undefined;
  return row ? { sprintId: row.sprint_id } : null;
}

export async function sprintGoalExists(input: { goalId: string }): Promise<boolean> {
  const result = await query('SELECT 1 FROM sprint_goals WHERE id = $1 LIMIT 1', [input.goalId]);
  return result.rows.length > 0;
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
      WHERE sprint_id = $1
      GROUP BY COALESCE(NULLIF(TRIM(BOTH FROM team), ''), goal_type::text)
      ORDER BY 1 ASC`,
    [input.sprintId]
  );
  return result.rows as SprintGoalsAggRow[];
}
