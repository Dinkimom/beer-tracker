-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Карточки-виджеты (крестики-нолики и следующие интеграции) живут в comments.kind.
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_kind_check;
ALTER TABLE comments
  ADD CONSTRAINT comments_kind_check
  CHECK (kind IN ('text', 'image', 'diagram', 'widget'));
