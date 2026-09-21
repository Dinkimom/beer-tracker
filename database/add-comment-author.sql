-- Автор sticky-note: uuid сотрудника из public.registry_employees.
-- Для уже существующей БД: psql ... -f database/add-comment-author.sql

ALTER TABLE beer_tracker.comments
    DROP COLUMN IF EXISTS author_name;

ALTER TABLE beer_tracker.comments
    DROP COLUMN IF EXISTS created_by;

ALTER TABLE beer_tracker.comments
    ADD COLUMN IF NOT EXISTS created_by UUID;

COMMENT ON COLUMN beer_tracker.comments.created_by IS 'uuid сотрудника из public.registry_employees (автор заметки)';
