-- Спринты длиннее 10 рабочих дней: индексы дня 0..399 (MAX_PLANNER_DAY_INDEX).
-- Для уже существующей БД: psql ... -f database/widen-planner-day-checks.sql
-- (или docker compose exec -T db psql -U ... -d ... < database/widen-planner-day-checks.sql)

ALTER TABLE beer_tracker.task_positions
    DROP CONSTRAINT IF EXISTS task_positions_start_day_check;
ALTER TABLE beer_tracker.task_positions
    ADD CONSTRAINT task_positions_start_day_check
    CHECK (start_day >= 0 AND start_day < 400);

ALTER TABLE beer_tracker.task_positions
    DROP CONSTRAINT IF EXISTS task_positions_planned_start_day_check;
ALTER TABLE beer_tracker.task_positions
    ADD CONSTRAINT task_positions_planned_start_day_check
    CHECK (planned_start_day IS NULL OR (planned_start_day >= 0 AND planned_start_day < 400));

ALTER TABLE beer_tracker.task_position_segments
    DROP CONSTRAINT IF EXISTS task_position_segments_start_day_check;
ALTER TABLE beer_tracker.task_position_segments
    ADD CONSTRAINT task_position_segments_start_day_check
    CHECK (start_day >= 0 AND start_day < 400);

ALTER TABLE beer_tracker.comments
    DROP CONSTRAINT IF EXISTS comments_day_check;
ALTER TABLE beer_tracker.comments
    ADD CONSTRAINT comments_day_check
    CHECK (day IS NULL OR (day >= 0 AND day < 400));
