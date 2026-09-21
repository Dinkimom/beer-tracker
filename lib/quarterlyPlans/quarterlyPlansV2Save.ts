import type { QueryParams } from '@/types';

import { runBeerTrackerTransaction } from '@/lib/db';

import { ensureQuarterlyPlanV2Tables } from './ensureQuarterlyPlanV2Tables';
import { storyEventsPutEntries } from './storyEventsDb';
import { storyPhasesPutEntries } from './storyPhasesDb';

/** Уникальные ключи эпиков с сохранением порядка (защита от дублей в теле PUT). */
export function dedupeEpicKeysForSave(epicKeys: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of epicKeys) {
    const key = raw?.trim();
    if (!key) continue;
    const norm = key.toUpperCase();
    if (seen.has(norm)) continue;
    seen.add(norm);
    result.push(key);
  }
  return result;
}

interface SaveQuarterlyPlanV2Payload {
  epicKeys: string[];
  excludedStoryKeys: string[];
  planId: string;
  storyEvents: unknown;
  storyPhases: unknown;
}

type TxQuery = (sql: string, params?: QueryParams) => Promise<void>;

async function insertStoryPhases(tx: TxQuery, planId: string, storyPhases: unknown): Promise<void> {
  const phaseEntries = storyPhasesPutEntries(storyPhases);
  for (const { storyKey, phase } of phaseEntries) {
    await tx(
      `INSERT INTO quarterly_plan_v2_story_phases
         (id, plan_id, story_key, phase_kind, sprint_index, start_day, duration_days, updated_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        phase.id,
        planId,
        storyKey,
        phase.kind,
        phase.sprintIndex,
        phase.startDay,
        phase.durationDays,
      ]
    );
  }
}

async function insertStoryEvents(tx: TxQuery, planId: string, storyEvents: unknown): Promise<void> {
  const eventEntries = storyEventsPutEntries(storyEvents);
  for (const { storyKey, event } of eventEntries) {
    await tx(
      `INSERT INTO quarterly_plan_v2_story_events
         (id, plan_id, story_key, event_kind, sprint_index, updated_at)
       VALUES ($1::uuid, $2, $3, $4, $5, NOW())`,
      [event.id, planId, storyKey, event.kind, event.weekIndex]
    );
  }
}

async function syncEpicKeysForPlan(tx: TxQuery, planId: string, epicKeysList: string[]): Promise<void> {
  for (let i = 0; i < epicKeysList.length; i++) {
    await tx(
      `INSERT INTO quarterly_plan_v2_epics (plan_id, epic_key, display_order)
       VALUES ($1::uuid, $2, $3)
       ON CONFLICT (plan_id, epic_key) DO UPDATE
         SET display_order = EXCLUDED.display_order`,
      [planId, epicKeysList[i], i]
    );
  }
  if (epicKeysList.length === 0) {
    await tx(`DELETE FROM quarterly_plan_v2_epics WHERE plan_id = $1::uuid`, [planId]);
    return;
  }
  await tx(
    `DELETE FROM quarterly_plan_v2_epics
     WHERE plan_id = $1::uuid AND epic_key <> ALL($2::text[])`,
    [planId, epicKeysList]
  );
}

async function insertExcludedStories(
  tx: TxQuery,
  planId: string,
  excludedStoryKeys: unknown
): Promise<void> {
  await tx(`DELETE FROM quarterly_plan_v2_excluded_stories WHERE plan_id = $1`, [planId]);
  const excludedList = Array.isArray(excludedStoryKeys) ? excludedStoryKeys : [];
  for (const storyKey of excludedList) {
    if (!storyKey?.trim()) continue;
    await tx(
      `INSERT INTO quarterly_plan_v2_excluded_stories (plan_id, story_key) VALUES ($1, $2)`,
      [planId, storyKey]
    );
  }
}

/**
 * Сохранение плана v2 в одной транзакции (pool.connect).
 */
export async function saveQuarterlyPlanV2InTransaction(payload: SaveQuarterlyPlanV2Payload): Promise<void> {
  await ensureQuarterlyPlanV2Tables();

  const { planId, storyPhases, storyEvents, excludedStoryKeys } = payload;
  const epicKeysList = dedupeEpicKeysForSave(payload.epicKeys);

  await runBeerTrackerTransaction(async (run) => {
    await run(`SELECT pg_advisory_xact_lock(hashtext($1::text))`, [planId]);

    await syncEpicKeysForPlan(run, planId, epicKeysList);

    await run(`DELETE FROM quarterly_plan_v2_story_phases WHERE plan_id = $1`, [planId]);
    await insertStoryPhases(run, planId, storyPhases);

    await insertExcludedStories(run, planId, excludedStoryKeys);

    await run(`DELETE FROM quarterly_plan_v2_story_events WHERE plan_id = $1`, [planId]);
    await insertStoryEvents(run, planId, storyEvents);
  });
}
