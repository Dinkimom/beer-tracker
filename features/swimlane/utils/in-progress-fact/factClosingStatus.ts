import type { Task } from '@/types';

import { mapTrackerStatusTypeKeyToCategory } from '@/lib/trackerIntegration/statusTypeDefaults';
import { mapStatus } from '@/utils/statusMapper';

/**
 * Трекер показывает «rc» отдельной фазой, не маркером закрытия.
 * mapStatus относит его к done, но на таймлайне факта это не галочка.
 */
const NOT_A_CLOSE_MARKER = new Set(['rc']);

function normalizeFactClosingStatusKey(statusKey: string): string {
  return statusKey.toLowerCase().replace(/\s+/g, '');
}

function isDoneCategoryTask(task: Task): boolean {
  if (task.status === 'done') return true;
  const typeKey = task.statusTypeKey?.trim();
  return Boolean(typeKey && mapTrackerStatusTypeKeyToCategory(typeKey) === 'done');
}

/** Ключи статусов, которые в этом спринте уже являются категорией done (кастомные имена Jira). */
export function doneFactStatusKeysFromTasks(tasks: Iterable<Task>): Set<string> {
  const keys = new Set<string>();
  for (const task of tasks) {
    if (!isDoneCategoryTask(task)) continue;
    const key = task.originalStatus?.trim();
    if (!key) continue;
    const normalized = normalizeFactClosingStatusKey(key);
    if (normalized) keys.add(normalized);
  }
  return keys;
}

/**
 * Фаза «закрыто» на таймлайне факта: квадрат с галочкой.
 * Трекер — ключ `closed`. Jira — `done` / «Готово» и прочие статусы категории done.
 */
export function isClosingFactStatusKey(
  statusKey: string,
  doneStatusKeys?: ReadonlySet<string>
): boolean {
  const normalized = normalizeFactClosingStatusKey(statusKey);
  if (!normalized || NOT_A_CLOSE_MARKER.has(normalized)) return false;
  if (mapStatus(statusKey) === 'done') return true;
  return doneStatusKeys?.has(normalized) ?? false;
}
