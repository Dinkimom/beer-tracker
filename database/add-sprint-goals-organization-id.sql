-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Legacy: add organization_id to sprint_goals.
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
  IF to_regclass('sprint_goals') IS NULL THEN
    RAISE NOTICE 'sprint_goals missing — nothing to migrate';
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
    FROM organizations o
   ORDER BY o.created_at ASC NULLS LAST, o.id ASC
   LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization in organizations — cannot backfill sprint_goals.organization_id';
  END IF;

  ALTER TABLE sprint_goals
    ADD COLUMN organization_id UUID;

  UPDATE sprint_goals
     SET organization_id = v_org_id
   WHERE organization_id IS NULL;

  ALTER TABLE sprint_goals
    ALTER COLUMN organization_id SET NOT NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'sprint_goals'::regclass
      AND conname = 'sprint_goals_organization_id_fkey'
  ) THEN
    ALTER TABLE sprint_goals
      ADD CONSTRAINT sprint_goals_organization_id_fkey
      FOREIGN KEY (organization_id)
      REFERENCES organizations (id)
      ON DELETE CASCADE;
  END IF;

  RAISE NOTICE 'sprint_goals.organization_id added; backfill organization_id = %', v_org_id;
END $$;

CREATE INDEX IF NOT EXISTS idx_sprint_goals_org_sprint
  ON sprint_goals (organization_id, sprint_id);

COMMIT;
