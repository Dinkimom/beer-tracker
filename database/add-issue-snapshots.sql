-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Снимки задач и кеш changelog (синк / бэклог / карточка issue).
-- Для уже существующей БД без этих таблиц (init.sql применялся раньше):
--   psql -v ON_ERROR_STOP=1 ... -f database/add-issue-snapshots.sql
-- Docker entrypoint init.sql сам том не обновляет.

CREATE TABLE IF NOT EXISTS issue_snapshots (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    issue_key TEXT NOT NULL,
    payload JSONB NOT NULL,
    tracker_updated_at TIMESTAMP WITH TIME ZONE,
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, issue_key)
);

CREATE INDEX IF NOT EXISTS idx_issue_snapshots_org_synced
    ON issue_snapshots (organization_id, synced_at DESC);

COMMENT ON TABLE issue_snapshots IS 'Нормализованный снимок issue для UI/бэклога';

CREATE TABLE IF NOT EXISTS issue_changelog_events (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    issue_key TEXT NOT NULL,
    changelog JSONB NOT NULL DEFAULT '[]'::jsonb,
    comments JSONB NOT NULL DEFAULT '[]'::jsonb,
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, issue_key)
);

CREATE INDEX IF NOT EXISTS idx_issue_changelog_org_synced
    ON issue_changelog_events (organization_id, synced_at DESC);

COMMENT ON TABLE issue_changelog_events IS 'Кеш ответа Tracker: changelog + comments по задаче (синк и API)';
