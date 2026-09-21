import { query } from '@/lib/db';
import { getBeerTrackerSchema } from '@/lib/env';

import {
  isLegacyStoryPhasesPrimaryKey,
  STORY_PHASES_PLAN_STORY_KIND_UNIQUE_INDEX,
} from './quarterlyPlanV2StoryPhasesMigration';

let tablesEnsured = false;

/** Добавляет id / phase_kind в таблицу, созданную до актуальной схемы. */
async function migrateQuarterlyPlanV2StoryPhasesColumns(): Promise<void> {
  await query(`
    ALTER TABLE quarterly_plan_v2_story_phases
      ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid()
  `);
  await query(`
    UPDATE quarterly_plan_v2_story_phases
    SET id = gen_random_uuid()
    WHERE id IS NULL
  `);
  await query(`
    ALTER TABLE quarterly_plan_v2_story_phases
      ADD COLUMN IF NOT EXISTS phase_kind VARCHAR(20) NOT NULL DEFAULT 'delivery'
  `);
}

/** Снимает PK (plan_id, story_key), ставит PK (id) и unique по kind. */
async function migrateQuarterlyPlanV2StoryPhasesPrimaryKey(): Promise<void> {
  const schema = getBeerTrackerSchema();
  const { rows } = await query<{ attname: string }>(
    `SELECT a.attname
     FROM pg_constraint con
     JOIN pg_class rel ON rel.oid = con.conrelid
     JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
     JOIN unnest(con.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
     JOIN pg_attribute a ON a.attrelid = rel.oid AND a.attnum = ck.attnum
     WHERE con.contype = 'p'
       AND con.conname = 'quarterly_plan_v2_story_phases_pkey'
       AND rel.relname = 'quarterly_plan_v2_story_phases'
       AND nsp.nspname = $1
     ORDER BY ck.ord`,
    [schema]
  );

  const pkColumns = rows.map((row) => row.attname);
  if (isLegacyStoryPhasesPrimaryKey(pkColumns)) {
    await query(
      `ALTER TABLE quarterly_plan_v2_story_phases
         DROP CONSTRAINT quarterly_plan_v2_story_phases_pkey`
    );
    await query(`ALTER TABLE quarterly_plan_v2_story_phases ALTER COLUMN id SET NOT NULL`);
    await query(`ALTER TABLE quarterly_plan_v2_story_phases ADD PRIMARY KEY (id)`);
  }

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ${STORY_PHASES_PLAN_STORY_KIND_UNIQUE_INDEX}
      ON quarterly_plan_v2_story_phases (plan_id, story_key, phase_kind)
  `);
}

async function runQuarterlyPlanV2StoryPhasesMigrations(): Promise<void> {
  await migrateQuarterlyPlanV2StoryPhasesColumns();
  await migrateQuarterlyPlanV2StoryPhasesPrimaryKey();
}

/**
 * Идемпотентно создаёт таблицы v2 (для БД без 02-quarterly-plan-v2.sql в init).
 * Флаг сбрасывается при перезапуске процесса Next.js.
 */
export async function ensureQuarterlyPlanV2Tables(): Promise<void> {
  if (tablesEnsured) {
    await runQuarterlyPlanV2StoryPhasesMigrations();
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS quarterly_plan_v2_epics (
      plan_id UUID NOT NULL REFERENCES quarterly_plans(id) ON DELETE CASCADE,
      epic_key TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (plan_id, epic_key)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS quarterly_plan_v2_story_phases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id UUID NOT NULL REFERENCES quarterly_plans(id) ON DELETE CASCADE,
      story_key TEXT NOT NULL,
      phase_kind VARCHAR(20) NOT NULL DEFAULT 'delivery'
        CHECK (phase_kind IN ('delivery', 'discovery')),
      sprint_index INTEGER NOT NULL,
      start_day INTEGER NOT NULL,
      duration_days INTEGER NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS quarterly_plan_v2_excluded_stories (
      plan_id UUID NOT NULL REFERENCES quarterly_plans(id) ON DELETE CASCADE,
      story_key TEXT NOT NULL,
      PRIMARY KEY (plan_id, story_key)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS quarterly_plan_v2_story_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id UUID NOT NULL REFERENCES quarterly_plans(id) ON DELETE CASCADE,
      story_key TEXT NOT NULL,
      event_kind VARCHAR(40) NOT NULL,
      sprint_index INTEGER NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (plan_id, story_key, sprint_index)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_quarterly_plan_v2_epics_plan
      ON quarterly_plan_v2_epics(plan_id)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_quarterly_plan_v2_story_phases_plan
      ON quarterly_plan_v2_story_phases(plan_id)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_quarterly_plan_v2_excluded_stories_plan
      ON quarterly_plan_v2_excluded_stories(plan_id)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_quarterly_plan_v2_story_events_plan
      ON quarterly_plan_v2_story_events(plan_id)
  `);

  await runQuarterlyPlanV2StoryPhasesMigrations();
  tablesEnsured = true;
}
