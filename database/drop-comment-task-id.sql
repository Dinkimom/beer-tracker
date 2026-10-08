-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Заметки планера живут только на свимлейне (assignee + day/part), не в строке занятости.
-- Для уже существующей БД: psql ... -f database/drop-comment-task-id.sql

DROP INDEX IF EXISTS idx_comments_task;

ALTER TABLE comments
    DROP COLUMN IF EXISTS task_id;
