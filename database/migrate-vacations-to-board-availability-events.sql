-- Одноразовая миграция: vacations → board_availability_events
-- Все строки из beer_tracker.vacations становятся событиями с event_type = 'vacation'
-- (UUID и прочие поля сохраняются).
--
-- Порядок для продакшена:
-- 1) Задеплоить приложение с новой таблицей/API (или сначала применить только CREATE TABLE вручную).
-- 2) Выполнить этот файл целиком в целевой БД.

CREATE TABLE IF NOT EXISTS beer_tracker.board_availability_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id INTEGER NOT NULL,
    member_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('vacation', 'tech_sprint', 'sick_leave', 'duty')),
    tech_sprint_type VARCHAR(10) CHECK (tech_sprint_type IS NULL OR tech_sprint_type IN ('web', 'back', 'qa')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date),
    CHECK (
        (event_type = 'tech_sprint' AND tech_sprint_type IS NOT NULL)
        OR (event_type <> 'tech_sprint' AND tech_sprint_type IS NULL)
    )
);

-- Копия данных из старой таблицы (только если vacations ещё существует)
DO $migrate$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables AS t
        WHERE t.table_schema = 'beer_tracker'
          AND t.table_name = 'vacations'
    ) THEN
        INSERT INTO beer_tracker.board_availability_events (
            id,
            board_id,
            member_id,
            member_name,
            event_type,
            tech_sprint_type,
            start_date,
            end_date,
            created_at,
            updated_at
        )
        SELECT
            v.id,
            v.board_id,
            v.member_id,
            v.member_name,
            'vacation',
            NULL,
            v.start_date,
            v.end_date,
            v.created_at,
            v.updated_at
        FROM beer_tracker.vacations AS v
        ON CONFLICT (id) DO NOTHING;
    END IF;
END
$migrate$;

DROP INDEX IF EXISTS beer_tracker.idx_vacations_board;
DROP INDEX IF EXISTS beer_tracker.idx_vacations_member;
DROP INDEX IF EXISTS beer_tracker.idx_vacations_dates;

DROP TABLE IF EXISTS beer_tracker.vacations;

CREATE INDEX IF NOT EXISTS idx_board_availability_events_board ON beer_tracker.board_availability_events(board_id);
CREATE INDEX IF NOT EXISTS idx_board_availability_events_member ON beer_tracker.board_availability_events(member_id);
CREATE INDEX IF NOT EXISTS idx_board_availability_events_dates ON beer_tracker.board_availability_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_board_availability_events_type ON beer_tracker.board_availability_events(event_type);
