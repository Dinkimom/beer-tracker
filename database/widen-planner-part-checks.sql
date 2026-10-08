-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Часть дня может быть 0..3 (сетка из 2, 3 или 4 таймслотов).
-- Для уже существующей БД: psql ... -f database/widen-planner-part-checks.sql
-- Смена сетки в админке расширяет те же ограничения сама.

ALTER TABLE task_positions
    DROP CONSTRAINT IF EXISTS task_positions_start_part_check;
ALTER TABLE task_positions
    ADD CONSTRAINT task_positions_start_part_check
    CHECK (start_part >= 0 AND start_part < 4);

ALTER TABLE task_positions
    DROP CONSTRAINT IF EXISTS task_positions_planned_start_part_check;
ALTER TABLE task_positions
    ADD CONSTRAINT task_positions_planned_start_part_check
    CHECK (planned_start_part IS NULL OR (planned_start_part >= 0 AND planned_start_part < 4));

ALTER TABLE task_position_segments
    DROP CONSTRAINT IF EXISTS task_position_segments_start_part_check;
ALTER TABLE task_position_segments
    ADD CONSTRAINT task_position_segments_start_part_check
    CHECK (start_part >= 0 AND start_part < 4);

ALTER TABLE comments
    DROP CONSTRAINT IF EXISTS comments_part_check;
ALTER TABLE comments
    ADD CONSTRAINT comments_part_check
    CHECK (part IS NULL OR (part >= 0 AND part < 4));
