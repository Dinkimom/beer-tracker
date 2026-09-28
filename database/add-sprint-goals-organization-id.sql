-- Legacy: add organization_id to beer_tracker.sprint_goals.
-- Target: deployments whose sprint_goals predates the multi-tenant column in init.sql.
--
-- Usage:
--   psql -v ON_ERROR_STOP=1 -f database/add-sprint-goals-organization-id.sql
--
-- Backfills all existing rows to the single (or oldest) organization in the DB.

BEGIN;

DO $$
DECLARE
  v_org_id UUID;
BEGIN
  IF to_regclass('beer_tracker.sprint_goals') IS NULL THEN
    RAISE NOTICE 'beer_tracker.sprint_goals missing — nothing to migrate';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'beer_tracker'
      AND table_name = 'sprint_goals'
      AND column_name = 'organization_id'
  ) THEN
    RAISE NOTICE 'sprint_goals.organization_id already present — skip';
    RETURN;
  END IF;

  SELECT o.id
    INTO v_org_id
    FROM beer_tracker.organizations o
   ORDER BY o.created_at ASC NULLS LAST, o.id ASC
   LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization in beer_tracker.organizations — cannot backfill sprint_goals.organization_id';
  END IF;

  ALTER TABLE beer_tracker.sprint_goals
    ADD COLUMN organization_id UUID;

  UPDATE beer_tracker.sprint_goals
     SET organization_id = v_org_id
   WHERE organization_id IS NULL;

  ALTER TABLE beer_tracker.sprint_goals
    ALTER COLUMN organization_id SET NOT NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'beer_tracker.sprint_goals'::regclass
      AND conname = 'sprint_goals_organization_id_fkey'
  ) THEN
    ALTER TABLE beer_tracker.sprint_goals
      ADD CONSTRAINT sprint_goals_organization_id_fkey
      FOREIGN KEY (organization_id)
      REFERENCES beer_tracker.organizations (id)
      ON DELETE CASCADE;
  END IF;

  RAISE NOTICE 'sprint_goals.organization_id added; backfill organization_id = %', v_org_id;
END $$;

CREATE INDEX IF NOT EXISTS idx_sprint_goals_org_sprint
  ON beer_tracker.sprint_goals (organization_id, sprint_id);

COMMIT;
