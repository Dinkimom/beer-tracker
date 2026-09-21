/**
 * Утилиты для DnD канбана: маппинг колонка <-> ключ статуса
 * Колонки приходят из GET /v3/boards/<id>/columns с полем statusKeys (ключи статусов).
 */

import type { BoardColumn } from '@/types/tracker';

/**
 * Нормализует ключ статуса для сравнения с переходами из Tracker API.
 * Tracker может возвращать "inReview", "in_review" и т.д.; колонки — "inreview".
 * Убираем пробелы, подчёркивания, дефисы и приводим к нижнему регистру.
 */
export function normalizeStatusKeyForComparison(key: string): string {
  return (key || '')
    .toLowerCase()
    .replace(/[\s_-]/g, '')
    .trim();
}

/** Возвращает первый ключ статуса колонки (из API /boards/<id>/columns). Нужен для обратной совместимости. */
export function getColumnStatusKey(column: BoardColumn): string | null {
  if (column.statusKeys?.length) return column.statusKeys[0];
  return (column.id || '').trim() || null;
}

const KANBAN_DRAG_PREFIX = 'kanban-task-';
const KANBAN_DROP_PREFIX = 'kanban-column-';

export function kanbanTaskId(taskId: string): string {
  return KANBAN_DRAG_PREFIX + taskId;
}

export function kanbanColumnId(columnId: string): string {
  return KANBAN_DROP_PREFIX + columnId;
}

function parseKanbanColumnId(droppableId: string): string | null {
  return droppableId.startsWith(KANBAN_DROP_PREFIX)
    ? droppableId.slice(KANBAN_DROP_PREFIX.length)
    : null;
}

/** При группировке по исполнителю id колонки может быть "laneKey__columnId". Возвращает только columnId для API. */
export function getColumnIdFromDroppable(droppableId: string): string | null {
  const raw = parseKanbanColumnId(droppableId);
  if (!raw) return null;
  const sep = raw.indexOf('__');
  return sep >= 0 ? raw.slice(sep + 2) : raw;
}

export function parseKanbanTaskId(draggableId: string): string | null {
  return draggableId.startsWith(KANBAN_DRAG_PREFIX)
    ? draggableId.slice(KANBAN_DRAG_PREFIX.length)
    : null;
}
