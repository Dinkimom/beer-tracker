-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Фотокарточки и схемы планера: метаданные в planner_files, байты в S3 (storage_key).
-- Для уже существующей БД без таблицы: psql ... -f database/add-planner-comment-images.sql
-- Если таблица уже с BYTEA data: database/migrate-planner-files-to-s3.sql

CREATE TABLE IF NOT EXISTS planner_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    content_type VARCHAR(64) NOT NULL,
    byte_size INTEGER NOT NULL,
    storage_key TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_planner_files_org
    ON planner_files (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_planner_files_storage_key
    ON planner_files (storage_key);

ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS kind VARCHAR(16) NOT NULL DEFAULT 'text';

ALTER TABLE comments
    DROP CONSTRAINT IF EXISTS comments_kind_check;

ALTER TABLE comments
    ADD CONSTRAINT comments_kind_check
    CHECK (kind IN ('text', 'image', 'diagram'));

ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS image_file_id UUID REFERENCES planner_files (id);

CREATE INDEX IF NOT EXISTS idx_comments_image_file
    ON comments (image_file_id)
    WHERE image_file_id IS NOT NULL;
