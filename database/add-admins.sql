-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Одна миграция для уже существующей БД.
--
--   psql -v ON_ERROR_STOP=1 -f database/add-admins.sql
--
-- Делает:
--   1) admins (staff_uid = staff.id)
--   2) снимает FK analytics_events.user_id → users (колонка остаётся)
--   3) удаляет organization_invitations, если таблица ещё есть
--   4) удаляет users, если таблица ещё есть

CREATE TABLE IF NOT EXISTS admins (
    staff_uid UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE admins IS 'Админы продукта: staff_uid = staff.id; полный доступ в админке ко всем организациям';
COMMENT ON COLUMN admins.staff_uid IS 'uuid сотрудника из staff';

ALTER TABLE IF EXISTS analytics_events
    DROP CONSTRAINT IF EXISTS analytics_events_user_id_fkey;

DROP TABLE IF EXISTS organization_invitations;
DROP TABLE IF EXISTS users CASCADE;
