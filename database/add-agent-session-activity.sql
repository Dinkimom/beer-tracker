-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Что делает внешний агент над сессией: шаг по его последнему вызову MCP (для планера).
ALTER TABLE agent_sessions
    ADD COLUMN IF NOT EXISTS agent_step VARCHAR(16),
    ADD COLUMN IF NOT EXISTS agent_step_at TIMESTAMP WITH TIME ZONE;
