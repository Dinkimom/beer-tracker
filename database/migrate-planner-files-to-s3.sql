-- One-shot: снести фотокарточки/схемы в BYTEA и перейти на storage_key (S3).
-- Существующие файлы не переносятся. Повторный запуск после DROP data безопасен
-- (колонки data уже нет — ветка не трогает живые строки).
-- psql ... -f database/migrate-planner-files-to-s3.sql

DELETE FROM beer_tracker.comments
 WHERE kind = 'image'
    OR text LIKE '<!--bt-excalidraw-v1-->%';

DELETE FROM beer_tracker.planner_files;

ALTER TABLE beer_tracker.planner_files
    DROP COLUMN IF EXISTS data;

ALTER TABLE beer_tracker.planner_files
    ADD COLUMN IF NOT EXISTS storage_key TEXT;

UPDATE beer_tracker.planner_files
   SET storage_key = id::text
 WHERE storage_key IS NULL;

ALTER TABLE beer_tracker.planner_files
    ALTER COLUMN storage_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_planner_files_storage_key
    ON beer_tracker.planner_files (storage_key);

ALTER TABLE beer_tracker.comments
    DROP CONSTRAINT IF EXISTS comments_kind_check;

ALTER TABLE beer_tracker.comments
    ADD CONSTRAINT comments_kind_check
    CHECK (kind IN ('text', 'image', 'diagram'));
