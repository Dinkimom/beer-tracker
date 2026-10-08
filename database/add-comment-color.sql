-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Цвет sticky-note на свимлейне (жёлтый / розовый / зелёный / голубой / серый).
-- Для уже существующей БД: psql ... -f database/add-comment-color.sql

ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS color VARCHAR(16) NOT NULL DEFAULT 'yellow';

ALTER TABLE comments
    DROP CONSTRAINT IF EXISTS comments_color_check;

ALTER TABLE comments
    ADD CONSTRAINT comments_color_check
    CHECK (color IN ('yellow', 'pink', 'green', 'blue', 'gray'));
