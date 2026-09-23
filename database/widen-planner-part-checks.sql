-- Часть дня может быть 0..3 (сетка из 2, 3 или 4 таймслотов).
-- Для уже существующей БД: psql ... -f database/widen-planner-part-checks.sql
-- Смена сетки в админке расширяет те же ограничения сама.

ALTER TABLE beer_tracker.task_positions
    DROP CONSTRAINT IF EXISTS task_positions_start_part_check;
ALTER TABLE beer_tracker.task_positions
    ADD CONSTRAINT task_positions_start_part_check
    CHECK (start_part >= 0 AND start_part < 4);

ALTER TABLE beer_tracker.task_positions
    DROP CONSTRAINT IF EXISTS task_positions_planned_start_part_check;
ALTER TABLE beer_tracker.task_positions
    ADD CONSTRAINT task_positions_planned_start_part_check
    CHECK (planned_start_part IS NULL OR (planned_start_part >= 0 AND planned_start_part < 4));

ALTER TABLE beer_tracker.task_position_segments
    DROP CONSTRAINT IF EXISTS task_position_segments_start_part_check;
ALTER TABLE beer_tracker.task_position_segments
    ADD CONSTRAINT task_position_segments_start_part_check
    CHECK (start_part >= 0 AND start_part < 4);

ALTER TABLE beer_tracker.comments
    DROP CONSTRAINT IF EXISTS comments_part_check;
ALTER TABLE beer_tracker.comments
    ADD CONSTRAINT comments_part_check
    CHECK (part IS NULL OR (part >= 0 AND part < 4));
