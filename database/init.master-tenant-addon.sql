-- Adds tenant/organization layer (organizations, secrets, admins) on an existing Postgres.
-- Каталог команд и сотрудников: database/add-staff-teams.sql (после этой addon-схемы).
--
-- Usage:
--   psql -v ON_ERROR_STOP=1 -f database/init.master-tenant-addon.sql
--   psql -v ON_ERROR_STOP=1 -f database/add-staff-teams.sql

CREATE SCHEMA IF NOT EXISTS beer_tracker;
SET search_path TO beer_tracker, public;

CREATE OR REPLACE FUNCTION beer_tracker.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS beer_tracker.admins (
  staff_uid UUID PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS beer_tracker.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT,
  tracker_org_id TEXT NOT NULL DEFAULT '',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  sync_next_run_at TIMESTAMP WITH TIME ZONE,
  initial_sync_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_slug_lower
  ON beer_tracker.organizations (LOWER(TRIM(slug)))
  WHERE slug IS NOT NULL;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON beer_tracker.organizations
  FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

CREATE TABLE IF NOT EXISTS beer_tracker.organization_secrets (
  organization_id UUID PRIMARY KEY REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
  encrypted_tracker_token BYTEA NOT NULL,
  encryption_key_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_organization_secrets_updated_at
  BEFORE UPDATE ON beer_tracker.organization_secrets
  FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();
