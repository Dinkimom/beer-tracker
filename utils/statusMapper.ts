/**
 * Утилита для маппинга статусов задач из Tracker API в упрощенные статусы приложения
 */

export type TaskStatus = 'done' | 'in-progress' | 'paused' | 'todo';

/** Как у Jira status key: lower-case, без пробелов и пунктуации. */
function normalizeTrackerStatusKey(statusKey: string): string {
  return statusKey
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9а-яё]+/gi, '');
}

/**
 * Маппит ключ статуса из Tracker API в упрощенный статус приложения.
 * Только точное совпадение нормализованного ключа — без includes/подстрок
 * (иначе «готово к разработке» ошибочно станет done).
 */
export function mapStatus(statusKey: string): TaskStatus | undefined {
  const normalizedKey = normalizeTrackerStatusKey(statusKey);
  const statusMap: Record<string, TaskStatus> = {
    backlog: 'todo',
    readyfordevelopment: 'todo',
    readyfordev: 'todo',
    transferredtodevelopment: 'todo',
    new: 'todo',
    open: 'todo',
    todo: 'todo',
    готовокразработке: 'todo',

    inprogress: 'in-progress',
    review: 'in-progress',
    inreview: 'in-progress',
    readyfortest: 'in-progress',
    readyfortesting: 'in-progress',
    intesting: 'in-progress',
    готовоктесту: 'in-progress',
    готовоктестированию: 'in-progress',

    rc: 'done',
    closed: 'done',
    done: 'done',
    resolved: 'done',
    complete: 'done',
    completed: 'done',
    готово: 'done',
    выполнен: 'done',
    выполнено: 'done',
    закрыт: 'done',
    закрыто: 'done',
    wontbedone: 'done',
    wontfix: 'done',
    cancelled: 'done',
    canceled: 'done',
    declined: 'done',
    rejected: 'done',

    paused: 'paused',
    blocked: 'paused',
    defect: 'paused',
  };
  return statusMap[normalizedKey];
}
