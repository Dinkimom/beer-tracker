-- Продуктовая аналитика (снимки настроек, просмотры, клики).
-- Для уже существующей БД: psql ... -f database/add-analytics-events.sql
-- Приложение также создаёт таблицу идемпотентно при первом ingest.

CREATE TABLE IF NOT EXISTS beer_tracker.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    user_id UUID,
    event_name TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ingested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_org_name_time
    ON beer_tracker.analytics_events (organization_id, event_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_name_time
    ON beer_tracker.analytics_events (user_id, event_name, occurred_at DESC)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time_identified
    ON beer_tracker.analytics_events (event_name, occurred_at DESC)
    WHERE user_id IS NOT NULL;

COMMENT ON TABLE beer_tracker.analytics_events IS 'Append-only продуктовая аналитика; формат события в payload JSONB';
COMMENT ON COLUMN beer_tracker.analytics_events.event_name IS 'client_settings, page_view, ui_click, … — список на уровне приложения';
COMMENT ON COLUMN beer_tracker.analytics_events.occurred_at IS 'Время на клиенте; ingested_at — когда строка попала в БД';
