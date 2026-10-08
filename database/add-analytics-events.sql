-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Продуктовая аналитика (снимки настроек, просмотры, клики).
-- Для уже существующей БД: psql ... -f database/add-analytics-events.sql
-- Приложение также создаёт таблицу идемпотентно при первом ingest.

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id UUID,
    event_name TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ingested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_org_name_time
    ON analytics_events (organization_id, event_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_name_time
    ON analytics_events (user_id, event_name, occurred_at DESC)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time_identified
    ON analytics_events (event_name, occurred_at DESC)
    WHERE user_id IS NOT NULL;

COMMENT ON TABLE analytics_events IS 'Append-only продуктовая аналитика; формат события в payload JSONB';
COMMENT ON COLUMN analytics_events.event_name IS 'client_settings, page_view, ui_click, … — список на уровне приложения';
COMMENT ON COLUMN analytics_events.occurred_at IS 'Время на клиенте; ingested_at — когда строка попала в БД';
