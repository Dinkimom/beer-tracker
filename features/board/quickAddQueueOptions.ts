import type { BoardListItem } from '@/lib/api/types';

export interface QuickAddQueueOption {
  key: string;
  name: string;
}

/** Уникальные ключи очередей из зарегистрированных досок (имя подтянется из Tracker). */
export function buildQuickAddQueueOptionsFromBoards(boards: BoardListItem[]): QuickAddQueueOption[] {
  const keys = new Set<string>();
  for (const board of boards) {
    const key = board.queue?.trim();
    if (key) {
      keys.add(key);
    }
  }
  return Array.from(keys, (key) => ({ key, name: key })).sort((a, b) =>
    a.key.localeCompare(b.key, 'ru')
  );
}

export function formatQuickAddQueueLabel(key: string, name: string): string {
  return `${key}: ${name}`;
}

/**
 * Очередь для попапа quick-add / конвертации заметки: как у черновика новой задачи
 * (`trackerQueue` из очереди команды доски), затем запасной ключ из списка.
 */
export function resolveQuickAddDraftQueueKey(
  taskQueue?: string | null,
  teamQueue?: string | null,
  fallbackQueueKey?: string | null
): string {
  return taskQueue?.trim() || teamQueue?.trim() || fallbackQueueKey?.trim() || '';
}
