-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Автор sticky-note: uuid сотрудника из public.registry_employees.
-- Для уже существующей БД: psql ... -f database/add-comment-author.sql

ALTER TABLE comments
    DROP COLUMN IF EXISTS author_name;

ALTER TABLE comments
    DROP COLUMN IF EXISTS created_by;

ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS created_by UUID;

COMMENT ON COLUMN comments.created_by IS 'uuid сотрудника из public.registry_employees (автор заметки)';
