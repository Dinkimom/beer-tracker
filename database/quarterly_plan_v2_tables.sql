-- Квартальное планирование v2 (эпики + фазы стори). Идемпотентно для docker/init.
CREATE TABLE IF NOT EXISTS beer_tracker.quarterly_plan_v2_epics (
    plan_id UUID NOT NULL REFERENCES beer_tracker.quarterly_plans(id) ON DELETE CASCADE,
    epic_key TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (plan_id, epic_key)
);

CREATE TABLE IF NOT EXISTS beer_tracker.quarterly_plan_v2_story_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES beer_tracker.quarterly_plans(id) ON DELETE CASCADE,
    story_key TEXT NOT NULL,
    phase_kind VARCHAR(20) NOT NULL DEFAULT 'delivery'
        CHECK (phase_kind IN ('delivery', 'discovery')),
    sprint_index INTEGER NOT NULL,
    start_day INTEGER NOT NULL,
    duration_days INTEGER NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quarterly_plan_v2_epics_plan
    ON beer_tracker.quarterly_plan_v2_epics(plan_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_plan_v2_story_phases_plan
    ON beer_tracker.quarterly_plan_v2_story_phases(plan_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_plan_v2_story_phases_story
    ON beer_tracker.quarterly_plan_v2_story_phases(plan_id, story_key);

CREATE TABLE IF NOT EXISTS beer_tracker.quarterly_plan_v2_excluded_stories (
    plan_id UUID NOT NULL REFERENCES beer_tracker.quarterly_plans(id) ON DELETE CASCADE,
    story_key TEXT NOT NULL,
    PRIMARY KEY (plan_id, story_key)
);

CREATE INDEX IF NOT EXISTS idx_quarterly_plan_v2_excluded_stories_plan
    ON beer_tracker.quarterly_plan_v2_excluded_stories(plan_id);

CREATE TABLE IF NOT EXISTS beer_tracker.quarterly_plan_v2_story_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES beer_tracker.quarterly_plans(id) ON DELETE CASCADE,
    story_key TEXT NOT NULL,
    event_kind VARCHAR(40) NOT NULL,
    sprint_index INTEGER NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (plan_id, story_key, sprint_index)
);

CREATE INDEX IF NOT EXISTS idx_quarterly_plan_v2_story_events_plan
    ON beer_tracker.quarterly_plan_v2_story_events(plan_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_plan_v2_story_events_story
    ON beer_tracker.quarterly_plan_v2_story_events(plan_id, story_key);

-- Миграция существующих таблиц (старая схема без id / phase_kind).
ALTER TABLE beer_tracker.quarterly_plan_v2_story_phases
    ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
UPDATE beer_tracker.quarterly_plan_v2_story_phases
    SET id = gen_random_uuid()
    WHERE id IS NULL;
ALTER TABLE beer_tracker.quarterly_plan_v2_story_phases
    ADD COLUMN IF NOT EXISTS phase_kind VARCHAR(20) NOT NULL DEFAULT 'delivery';

-- Старая схема: PRIMARY KEY (plan_id, story_key) — одна фаза на story.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE con.contype = 'p'
      AND con.conname = 'quarterly_plan_v2_story_phases_pkey'
      AND rel.relname = 'quarterly_plan_v2_story_phases'
      AND nsp.nspname = 'beer_tracker'
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(con.conkey) AS ck(attnum)
        JOIN pg_attribute a ON a.attrelid = rel.oid AND a.attnum = ck.attnum
        WHERE a.attname = 'id'
      )
  ) THEN
    ALTER TABLE beer_tracker.quarterly_plan_v2_story_phases
      DROP CONSTRAINT quarterly_plan_v2_story_phases_pkey;
    ALTER TABLE beer_tracker.quarterly_plan_v2_story_phases
      ALTER COLUMN id SET NOT NULL;
    ALTER TABLE beer_tracker.quarterly_plan_v2_story_phases
      ADD PRIMARY KEY (id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_quarterly_plan_v2_story_phases_plan_story_kind
    ON beer_tracker.quarterly_plan_v2_story_phases (plan_id, story_key, phase_kind);
