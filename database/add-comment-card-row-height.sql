-- Вертикальный span заметки/фотокарточки в строках карточки свимлейна (comments.height).
-- width — длительность в частях таймлайна; height — число строк карточки (1–10), 1:1 с width.
-- position_y — сдвиг вверх в строках (layerShiftUp), legacy px сброшен в 0.
-- Дефолт height = 2 (совпадает с типичной длительностью 2 части).
-- Для уже существующей БД: psql ... -f database/add-comment-card-row-height.sql

UPDATE beer_tracker.comments
SET height = LEAST(
    10,
    GREATEST(
        1,
        CASE
            WHEN width IS NULL OR width <= 0 THEN 2
            WHEN width <= 60 THEN width
            ELSE GREATEST(1, ROUND(width::numeric / 100))
        END
    )
)
WHERE height IS NULL OR height > 20;

UPDATE beer_tracker.comments
SET position_y = 0
WHERE position_y IS NULL OR position_y > 9 OR position_y < 0;

ALTER TABLE beer_tracker.comments
    ALTER COLUMN height SET DEFAULT 2;

ALTER TABLE beer_tracker.comments
    DROP CONSTRAINT IF EXISTS comments_height_card_row_check;

ALTER TABLE beer_tracker.comments
    ADD CONSTRAINT comments_height_card_row_check
    CHECK (height >= 1 AND height <= 10);

ALTER TABLE beer_tracker.comments
    DROP CONSTRAINT IF EXISTS comments_position_y_layer_shift_check;

ALTER TABLE beer_tracker.comments
    ADD CONSTRAINT comments_position_y_layer_shift_check
    CHECK (position_y IS NULL OR (position_y >= 0 AND position_y <= 9));

COMMENT ON COLUMN beer_tracker.comments.height IS
    'Вертикальный span на свимлейне: число строк карточки (1:1 с width в частях таймлайна)';
COMMENT ON COLUMN beer_tracker.comments.position_y IS
    'Сдвиг карточки вверх в строках свимлейна (layerShiftUp); 0 = без сдвига';
