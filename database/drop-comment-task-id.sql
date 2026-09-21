-- Заметки планера живут только на свимлейне (assignee + day/part), не в строке занятости.
-- Для уже существующей БД: psql ... -f database/drop-comment-task-id.sql

DROP INDEX IF EXISTS beer_tracker.idx_comments_task;

ALTER TABLE beer_tracker.comments
    DROP COLUMN IF EXISTS task_id;
