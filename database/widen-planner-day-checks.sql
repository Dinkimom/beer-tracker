-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Спринты длиннее 10 рабочих дней: индексы дня 0..399 (MAX_PLANNER_DAY_INDEX).
-- Для уже существующей БД: psql ... -f database/widen-planner-day-checks.sql
-- (или docker compose exec -T db psql -U ... -d ... < database/widen-planner-day-checks.sql)

ALTER TABLE task_positions
    DROP CONSTRAINT IF EXISTS task_positions_start_day_check;
ALTER TABLE task_positions
    ADD CONSTRAINT task_positions_start_day_check
    CHECK (start_day >= 0 AND start_day < 400);

ALTER TABLE task_positions
    DROP CONSTRAINT IF EXISTS task_positions_planned_start_day_check;
ALTER TABLE task_positions
    ADD CONSTRAINT task_positions_planned_start_day_check
    CHECK (planned_start_day IS NULL OR (planned_start_day >= 0 AND planned_start_day < 400));

ALTER TABLE task_position_segments
    DROP CONSTRAINT IF EXISTS task_position_segments_start_day_check;
ALTER TABLE task_position_segments
    ADD CONSTRAINT task_position_segments_start_day_check
    CHECK (start_day >= 0 AND start_day < 400);

ALTER TABLE comments
    DROP CONSTRAINT IF EXISTS comments_day_check;
ALTER TABLE comments
    ADD CONSTRAINT comments_day_check
    CHECK (day IS NULL OR (day >= 0 AND day < 400));
