-- Legacy migration: add organization_id to sprint occupancy tables.
-- Target: old single-tenant deployments where organization_id was absent.
--
-- Usage:
--   psql -v ON_ERROR_STOP=1 -f database/legacy-add-organization-id.sql
--
-- What this script does:
-- 1) Uses existing row from beer_tracker.organizations.
-- 2) Uses explicit target organization UUID for backfill.
-- 3) Adds organization_id to:
--    - beer_tracker.task_positions
--    - beer_tracker.task_position_segments
--    - beer_tracker.occupancy_task_order
--    - beer_tracker.comments
--    - beer_tracker.task_links
-- 4) Backfills organization_id in existing rows.
-- 5) Rebuilds keys/constraints to current multi-tenant shape.

BEGIN;

CREATE SCHEMA IF NOT EXISTS beer_tracker;

DO $$
DECLARE
  v_org_id UUID;
  r RECORD;
BEGIN
  v_org_id := '9fd8ef6b-cfde-4180-a89a-d2865da61ad2'::uuid;

  IF NOT EXISTS (
    SELECT 1
    FROM beer_tracker.organizations o
    WHERE o.id = v_org_id
  ) THEN
    RAISE EXCEPTION 'Organization % not found in beer_tracker.organizations.', v_org_id;
  END IF;

  -- 1) task_positions
  IF to_regclass('beer_tracker.task_positions') IS NOT NULL THEN
    ALTER TABLE beer_tracker.task_positions
      ADD COLUMN IF NOT EXISTS organization_id UUID;

    UPDATE beer_tracker.task_positions
    SET organization_id = v_org_id
    WHERE organization_id IS NULL;

    -- Segments still FK to the old (sprint_id, task_id) PK — drop that first.
    IF to_regclass('beer_tracker.task_position_segments') IS NOT NULL THEN
      FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'beer_tracker.task_position_segments'::regclass
          AND contype = 'f'
      LOOP
        EXECUTE format('ALTER TABLE beer_tracker.task_position_segments DROP CONSTRAINT IF EXISTS %I', r.conname);
      END LOOP;
    END IF;

    -- Drop old PK (usually on sprint_id, task_id).
    FOR r IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'beer_tracker.task_positions'::regclass
        AND contype = 'p'
    LOOP
      EXECUTE format('ALTER TABLE beer_tracker.task_positions DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    -- Ensure NOT NULL + FK + PK in current contract shape.
    ALTER TABLE beer_tracker.task_positions
      ALTER COLUMN organization_id SET NOT NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'beer_tracker.task_positions'::regclass
        AND conname = 'task_positions_organization_id_fkey'
    ) THEN
      ALTER TABLE beer_tracker.task_positions
        ADD CONSTRAINT task_positions_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES beer_tracker.organizations (id)
        ON DELETE CASCADE;
    END IF;

    ALTER TABLE beer_tracker.task_positions
      ADD PRIMARY KEY (organization_id, sprint_id, task_id);
  END IF;

  -- 2) task_position_segments
  IF to_regclass('beer_tracker.task_position_segments') IS NOT NULL THEN
    ALTER TABLE beer_tracker.task_position_segments
      ADD COLUMN IF NOT EXISTS organization_id UUID;

    UPDATE beer_tracker.task_position_segments
    SET organization_id = v_org_id
    WHERE organization_id IS NULL;

    -- Drop all old foreign keys to task_positions (legacy shape).
    FOR r IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'beer_tracker.task_position_segments'::regclass
        AND contype = 'f'
    LOOP
      EXECUTE format('ALTER TABLE beer_tracker.task_position_segments DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    -- Drop old PK.
    FOR r IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'beer_tracker.task_position_segments'::regclass
        AND contype = 'p'
    LOOP
      EXECUTE format('ALTER TABLE beer_tracker.task_position_segments DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    ALTER TABLE beer_tracker.task_position_segments
      ALTER COLUMN organization_id SET NOT NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'beer_tracker.task_position_segments'::regclass
        AND conname = 'task_position_segments_organization_id_fkey'
    ) THEN
      ALTER TABLE beer_tracker.task_position_segments
        ADD CONSTRAINT task_position_segments_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES beer_tracker.organizations (id)
        ON DELETE CASCADE;
    END IF;

    ALTER TABLE beer_tracker.task_position_segments
      ADD PRIMARY KEY (organization_id, sprint_id, task_id, segment_index);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'beer_tracker.task_position_segments'::regclass
        AND conname = 'fk_task_position'
    ) THEN
      ALTER TABLE beer_tracker.task_position_segments
        ADD CONSTRAINT fk_task_position
        FOREIGN KEY (organization_id, sprint_id, task_id)
        REFERENCES beer_tracker.task_positions (organization_id, sprint_id, task_id)
        ON DELETE CASCADE;
    END IF;
  END IF;

  -- 3) occupancy_task_order
  IF to_regclass('beer_tracker.occupancy_task_order') IS NOT NULL THEN
    ALTER TABLE beer_tracker.occupancy_task_order
      ADD COLUMN IF NOT EXISTS organization_id UUID;

    UPDATE beer_tracker.occupancy_task_order
    SET organization_id = v_org_id
    WHERE organization_id IS NULL;

    -- Drop old PK (usually on sprint_id).
    FOR r IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'beer_tracker.occupancy_task_order'::regclass
        AND contype = 'p'
    LOOP
      EXECUTE format('ALTER TABLE beer_tracker.occupancy_task_order DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    ALTER TABLE beer_tracker.occupancy_task_order
      ALTER COLUMN organization_id SET NOT NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'beer_tracker.occupancy_task_order'::regclass
        AND conname = 'occupancy_task_order_organization_id_fkey'
    ) THEN
      ALTER TABLE beer_tracker.occupancy_task_order
        ADD CONSTRAINT occupancy_task_order_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES beer_tracker.organizations (id)
        ON DELETE CASCADE;
    END IF;

    ALTER TABLE beer_tracker.occupancy_task_order
      ADD PRIMARY KEY (organization_id, sprint_id);
  END IF;

  -- 4) comments (PK remains id; runtime INSERT includes organization_id)
  IF to_regclass('beer_tracker.comments') IS NOT NULL THEN
    ALTER TABLE beer_tracker.comments
      ADD COLUMN IF NOT EXISTS organization_id UUID;

    UPDATE beer_tracker.comments
    SET organization_id = v_org_id
    WHERE organization_id IS NULL;

    ALTER TABLE beer_tracker.comments
      ALTER COLUMN organization_id SET NOT NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'beer_tracker.comments'::regclass
        AND conname = 'comments_organization_id_fkey'
    ) THEN
      ALTER TABLE beer_tracker.comments
        ADD CONSTRAINT comments_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES beer_tracker.organizations (id)
        ON DELETE CASCADE;
    END IF;
  END IF;

  -- 5) task_links: unique_link becomes (organization_id, sprint_id, from_task_id, to_task_id)
  IF to_regclass('beer_tracker.task_links') IS NOT NULL THEN
    ALTER TABLE beer_tracker.task_links
      ADD COLUMN IF NOT EXISTS organization_id UUID;

    UPDATE beer_tracker.task_links
    SET organization_id = v_org_id
    WHERE organization_id IS NULL;

    ALTER TABLE beer_tracker.task_links
      ALTER COLUMN organization_id SET NOT NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'beer_tracker.task_links'::regclass
        AND conname = 'task_links_organization_id_fkey'
    ) THEN
      ALTER TABLE beer_tracker.task_links
        ADD CONSTRAINT task_links_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES beer_tracker.organizations (id)
        ON DELETE CASCADE;
    END IF;

    ALTER TABLE beer_tracker.task_links
      DROP CONSTRAINT IF EXISTS unique_link;

    ALTER TABLE beer_tracker.task_links
      ADD CONSTRAINT unique_link UNIQUE (organization_id, sprint_id, from_task_id, to_task_id);
  END IF;

  RAISE NOTICE 'Legacy organization_id migration completed. Backfill organization_id = %', v_org_id;
END $$;

-- Indexes expected by current runtime.
CREATE INDEX IF NOT EXISTS idx_task_positions_org_sprint
  ON beer_tracker.task_positions (organization_id, sprint_id);

CREATE INDEX IF NOT EXISTS idx_task_position_segments_position
  ON beer_tracker.task_position_segments (organization_id, sprint_id, task_id);

CREATE INDEX IF NOT EXISTS idx_comments_org_sprint
  ON beer_tracker.comments (organization_id, sprint_id);

CREATE INDEX IF NOT EXISTS idx_task_links_org_sprint
  ON beer_tracker.task_links (organization_id, sprint_id);

COMMIT;
