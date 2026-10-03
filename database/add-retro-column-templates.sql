-- Шаблон колонок ретро. Для уже существующей БД (init.sql применялся раньше).
-- Чистая БД: таблица есть в database/init.sql.
-- Сохранённые доски в retro_boards эта миграция не меняет.

CREATE TABLE IF NOT EXISTS beer_tracker.retro_column_templates (
    organization_id UUID PRIMARY KEY REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    columns JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_retro_column_templates_updated_at ON beer_tracker.retro_column_templates;
CREATE TRIGGER update_retro_column_templates_updated_at
    BEFORE UPDATE ON beer_tracker.retro_column_templates
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.retro_column_templates IS 'Шаблон колонок ретро организации. Не переписывает сохранённые доски спринтов';
