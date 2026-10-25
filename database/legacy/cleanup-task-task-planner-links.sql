-- Удалить из task_links чистые связи задача↔задача.
-- Оставляем только строки с участием заметки/фото/схемы (comment:{uuid} или uuid комментария).

DELETE FROM beer_tracker.task_links
WHERE from_task_id !~* '^comment:'
  AND to_task_id !~* '^comment:'
  AND from_task_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND to_task_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
