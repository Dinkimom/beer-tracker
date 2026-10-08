-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Шаблон колонок ретро. Для уже существующей БД (init.sql применялся раньше).
-- Чистая БД: таблица есть в database/init.sql.
-- Сохранённые доски в retro_boards эта миграция не меняет.

CREATE TABLE IF NOT EXISTS retro_column_templates (
    organization_id UUID PRIMARY KEY REFERENCES organizations (id) ON DELETE CASCADE,
    columns JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_retro_column_templates_updated_at ON retro_column_templates;
CREATE TRIGGER update_retro_column_templates_updated_at
    BEFORE UPDATE ON retro_column_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE retro_column_templates IS 'Шаблон колонок ретро организации. Не переписывает сохранённые доски спринтов';
