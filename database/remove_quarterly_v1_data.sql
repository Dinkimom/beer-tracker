-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

BEGIN;

-- Remove legacy quarterly planning v1 data structures.
DROP TABLE IF EXISTS quarterly_plan_participants;
DROP TABLE IF EXISTS vacation_entries;
DROP TABLE IF EXISTS tech_sprint_entries;
DROP TABLE IF EXISTS draft_tasks;
DROP TABLE IF EXISTS planned_items;

COMMIT;
