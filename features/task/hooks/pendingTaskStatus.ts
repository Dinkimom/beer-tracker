import type { Task } from '@/types';

/**
 * Статусы, которые пользователь только что сменил в этой вкладке.
 *
 * Поиск трекера отстаёт от перехода, а кэш задач спринта на сервере живёт в памяти одного процесса
 * и истекает через минуту — фоновое обновление или перезагрузка списка могли принести старый статус
 * и вернуть карточке прошлый цвет до перезагрузки страницы. Пока сервер не догнал, поверх его
 * ответа кладём свой статус; совпал — запись снимаем.
 */

type PendingStatusFields = Pick<
  Task,
  | 'originalStatus'
  | 'originalStatusDisplay'
  | 'originalStatusId'
  | 'resolution'
  | 'status'
  | 'statusColorKey'
  | 'statusTypeKey'
>;

/** Дольше индекс трекера не отстаёт; дальше верим серверу (статус могли сменить и вне планера). */
const PENDING_STATUS_TTL_MS = 5 * 60_000;

const pendingByTaskId = new Map<string, { expiresAt: number; fields: PendingStatusFields }>();

export function rememberTaskStatusChange(
  taskId: string,
  fields: PendingStatusFields,
  now: number = Date.now()
): void {
  pendingByTaskId.set(taskId, { expiresAt: now + PENDING_STATUS_TTL_MS, fields });
}

export function forgetTaskStatusChange(taskId: string): void {
  pendingByTaskId.delete(taskId);
}

function overlayPendingStatus(task: Task, now: number): Task {
  const pending = pendingByTaskId.get(task.id);
  if (!pending) return task;
  if (pending.expiresAt <= now || task.originalStatus === pending.fields.originalStatus) {
    pendingByTaskId.delete(task.id);
    return task;
  }
  return { ...task, ...pending.fields };
}

/** Накладывает недавние смены статуса на ответ сервера со списком задач. */
function applyPendingTaskStatuses<T extends { tasks: Task[] }>(response: T, now: number = Date.now()): T {
  if (pendingByTaskId.size === 0) return response;
  let changed = false;
  const tasks = response.tasks.map((task) => {
    const next = overlayPendingStatus(task, now);
    if (next !== task) changed = true;
    return next;
  });
  return changed ? { ...response, tasks } : response;
}

/**
 * Свежий ответ сервера со списком задач поверх того, что уже на экране:
 * недавние смены статуса не откатываются, а черновики быстрого добавления (заметка, фото, задача —
 * `isLocalTask`, на сервере их нет) не пропадают. Без этого фоновое обновление раз в минуту или
 * перезагрузка списка по realtime стирали пустую заметку, пока её не сохранили.
 */
export function reconcileFetchedSprintTasks<T extends { tasks: Task[] }>(
  fresh: T,
  previous: { tasks: Task[] } | undefined,
  now: number = Date.now()
): T {
  const withStatuses = applyPendingTaskStatuses(fresh, now);
  const freshIds = new Set(withStatuses.tasks.map((task) => task.id));
  const drafts = (previous?.tasks ?? []).filter((task) => task.isLocalTask === true && !freshIds.has(task.id));
  return drafts.length > 0 ? { ...withStatuses, tasks: [...withStatuses.tasks, ...drafts] } : withStatuses;
}
