-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Optimistic concurrency + soft-delete audit for planner sticky notes.

ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS deleted_by UUID;

CREATE INDEX IF NOT EXISTS idx_comments_sprint_active
    ON comments (sprint_id)
    WHERE deleted_at IS NULL;
