import { query } from '@/lib/db';

interface SprintGoalRow {
  done: boolean;
  id: string;
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

export async function insertSprintGoal(input: {
  goalType: string;
  organizationId: string;
  sprintId: number;
  team?: string | null;
  text: string;
}): Promise<SprintGoalRow> {
  const insert = await query(
    `INSERT INTO sprint_goals (organization_id, sprint_id, team, text, goal_type, done)
           VALUES ($1, $2, $3, $4, $5, false)
           RETURNING id, text, done`,
    [input.organizationId, input.sprintId, input.team ?? null, input.text, input.goalType]
  );
  return insert.rows[0] as SprintGoalRow;
}

export async function updateSprintGoal(input: {
  goalId: string;
  organizationId: string;
  updateFields: string[];
  updateValues: Array<boolean | number | string | null | undefined>;
}): Promise<SprintGoalRow | null> {
  const { goalId, updateFields, updateValues } = input;
  const paramIndex = updateValues.length + 1;
  const result = await query(
    `UPDATE sprint_goals
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, text, done`,
    [...updateValues, goalId]
  );
  return (result.rows[0] as SprintGoalRow | undefined) ?? null;
}

export async function deleteSprintGoal(input: {
  goalId: string;
  organizationId: string;
}): Promise<boolean> {
  const result = await query('DELETE FROM sprint_goals WHERE id = $1 RETURNING id', [input.goalId]);
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
