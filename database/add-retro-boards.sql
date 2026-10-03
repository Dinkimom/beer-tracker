-- Доска ретро. Для уже существующей БД (init.sql применялся раньше).
-- Чистая БД: таблица есть в database/init.sql.

CREATE TABLE IF NOT EXISTS beer_tracker.retro_boards (
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    board JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id)
);

DROP TRIGGER IF EXISTS update_retro_boards_updated_at ON beer_tracker.retro_boards;
CREATE TRIGGER update_retro_boards_updated_at
    BEFORE UPDATE ON beer_tracker.retro_boards
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.retro_boards IS 'Доска ретро спринта: колонки и карточки';
