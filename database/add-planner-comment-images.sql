-- Фотокарточки и схемы планера: метаданные в planner_files, байты в S3 (storage_key).
-- Для уже существующей БД без таблицы: psql ... -f database/add-planner-comment-images.sql
-- Если таблица уже с BYTEA data: database/migrate-planner-files-to-s3.sql

CREATE TABLE IF NOT EXISTS beer_tracker.planner_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    content_type VARCHAR(64) NOT NULL,
    byte_size INTEGER NOT NULL,
    storage_key TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_planner_files_org
    ON beer_tracker.planner_files (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_planner_files_storage_key
    ON beer_tracker.planner_files (storage_key);

ALTER TABLE beer_tracker.comments
    ADD COLUMN IF NOT EXISTS kind VARCHAR(16) NOT NULL DEFAULT 'text';

ALTER TABLE beer_tracker.comments
    DROP CONSTRAINT IF EXISTS comments_kind_check;

ALTER TABLE beer_tracker.comments
    ADD CONSTRAINT comments_kind_check
    CHECK (kind IN ('text', 'image', 'diagram'));

ALTER TABLE beer_tracker.comments
    ADD COLUMN IF NOT EXISTS image_file_id UUID REFERENCES beer_tracker.planner_files (id);

CREATE INDEX IF NOT EXISTS idx_comments_image_file
    ON beer_tracker.comments (image_file_id)
    WHERE image_file_id IS NOT NULL;
