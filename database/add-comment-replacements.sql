-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Черновик-замена в драфте агента: правка (update) или удаление (delete) заметки replaces_comment_id.
-- Копия с новым содержимым висит рядом с оригиналом (pending_approval); принять — перенести в оригинал.
ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS replaces_comment_id UUID,
    ADD COLUMN IF NOT EXISTS replace_action VARCHAR(8);
