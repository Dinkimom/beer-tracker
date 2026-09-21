-- Одна миграция для уже существующей БД.
--
--   psql -v ON_ERROR_STOP=1 -f database/add-admins.sql
--
-- Делает:
--   1) beer_tracker.admins (staff_uid = beer_tracker.staff.id)
--   2) снимает FK analytics_events.user_id → users (колонка остаётся)
--   3) удаляет organization_invitations, если таблица ещё есть
--   4) удаляет beer_tracker.users, если таблица ещё есть

CREATE TABLE IF NOT EXISTS beer_tracker.admins (
    staff_uid UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE beer_tracker.admins IS 'Админы продукта: staff_uid = beer_tracker.staff.id; полный доступ в админке ко всем организациям';
COMMENT ON COLUMN beer_tracker.admins.staff_uid IS 'uuid сотрудника из beer_tracker.staff';

ALTER TABLE IF EXISTS beer_tracker.analytics_events
    DROP CONSTRAINT IF EXISTS analytics_events_user_id_fkey;

DROP TABLE IF EXISTS beer_tracker.organization_invitations;
DROP TABLE IF EXISTS beer_tracker.users CASCADE;
