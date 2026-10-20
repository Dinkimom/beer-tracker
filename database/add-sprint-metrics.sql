-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Метрики спринтов (дашборд «Метрики»). Для уже существующей БД.
-- Чистая БД: таблицы есть в database/init.sql. Приложение также создаёт их само при первом обращении.

CREATE TABLE IF NOT EXISTS sprint_metrics (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    board_id INTEGER NOT NULL,
    sprint_id INTEGER NOT NULL,
    sprint_name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    open BOOLEAN NOT NULL,
    frozen BOOLEAN NOT NULL,
    formula_version INTEGER NOT NULL,
    facts JSONB NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, board_id, sprint_id)
);

COMMENT ON TABLE sprint_metrics IS 'Факты по задачам спринта для дашборда метрик; закончившиеся спринты заморожены';

