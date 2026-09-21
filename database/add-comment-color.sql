-- Цвет sticky-note на свимлейне (жёлтый / розовый / зелёный / голубой / серый).
-- Для уже существующей БД: psql ... -f database/add-comment-color.sql

ALTER TABLE beer_tracker.comments
    ADD COLUMN IF NOT EXISTS color VARCHAR(16) NOT NULL DEFAULT 'yellow';

ALTER TABLE beer_tracker.comments
    DROP CONSTRAINT IF EXISTS comments_color_check;

ALTER TABLE beer_tracker.comments
    ADD CONSTRAINT comments_color_check
    CHECK (color IN ('yellow', 'pink', 'green', 'blue', 'gray'));
