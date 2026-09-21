import { query } from '@/lib/db';

async function findQuarterlyPlanId(
  boardId: number,
  year: number,
  quarter: number
): Promise<string | null> {
  const planResult = await query(
    `SELECT id FROM quarterly_plans
       WHERE board_id = $1 AND year = $2 AND quarter = $3`,
    [boardId, year, quarter]
  );
  return planResult.rows[0]?.id ?? null;
}

async function insertQuarterlyPlan(
  boardId: number,
  year: number,
  quarter: number
): Promise<string> {
  const insertResult = await query(
    `INSERT INTO quarterly_plans (board_id, year, quarter, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
    [boardId, year, quarter]
  );
  return insertResult.rows[0].id;
}

async function touchQuarterlyPlanUpdatedAt(planId: string): Promise<void> {
  await query(`UPDATE quarterly_plans SET updated_at = NOW() WHERE id = $1`, [planId]);
}

export async function ensureQuarterlyPlanId(
  boardId: number,
  year: number,
  quarter: number
): Promise<string> {
  const existing = await findQuarterlyPlanId(boardId, year, quarter);
  if (existing) {
    return existing;
  }
  return insertQuarterlyPlan(boardId, year, quarter);
}

export async function resolveQuarterlyPlanIdForPut(
  boardId: number,
  year: number,
  quarter: number
): Promise<string> {
  const existing = await findQuarterlyPlanId(boardId, year, quarter);
  if (!existing) {
    return insertQuarterlyPlan(boardId, year, quarter);
  }
  await touchQuarterlyPlanUpdatedAt(existing);
  return existing;
}

export async function listQuarterlyPlanV2Epics(planId: string): Promise<Array<{ display_order: number; epic_key: string }>> {
  const result = await query(
    `SELECT epic_key, display_order FROM quarterly_plan_v2_epics
       WHERE plan_id = $1 ORDER BY display_order ASC`,
    [planId]
  );
  return result.rows as Array<{ display_order: number; epic_key: string }>;
}

interface StoryPhaseRow {
  duration_days: number;
  id?: string;
  phase_kind?: string | null;
  sprint_index: number;
  start_day: number;
  story_key: string;
}

export async function listQuarterlyPlanV2StoryPhases(planId: string): Promise<StoryPhaseRow[]> {
  try {
    const result = await query(
      `SELECT id::text AS id, story_key, COALESCE(phase_kind, 'delivery') AS phase_kind,
              sprint_index, start_day, duration_days
       FROM quarterly_plan_v2_story_phases WHERE plan_id = $1`,
      [planId]
    );
    return result.rows as StoryPhaseRow[];
  } catch {
    const result = await query(
      `SELECT story_key, sprint_index, start_day, duration_days
         FROM quarterly_plan_v2_story_phases WHERE plan_id = $1`,
      [planId]
    );
    return result.rows as StoryPhaseRow[];
  }
}

export async function listQuarterlyPlanV2ExcludedStories(planId: string): Promise<string[]> {
  try {
    const result = await query(
      `SELECT story_key FROM quarterly_plan_v2_excluded_stories WHERE plan_id = $1`,
      [planId]
    );
    return result.rows.map((r: { story_key: string }) => r.story_key);
  } catch {
    return [];
  }
}

interface StoryEventRow {
  event_kind: string;
  id?: string;
  sprint_index: number;
  story_key: string;
}

export async function listQuarterlyPlanV2StoryEvents(planId: string): Promise<StoryEventRow[]> {
  try {
    const result = await query(
      `SELECT id::text AS id, story_key, event_kind, sprint_index
       FROM quarterly_plan_v2_story_events WHERE plan_id = $1`,
      [planId]
    );
    return result.rows as StoryEventRow[];
  } catch {
    return [];
  }
}
