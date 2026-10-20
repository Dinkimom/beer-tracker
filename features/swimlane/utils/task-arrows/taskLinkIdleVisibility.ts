import type { SwimlaneLinksIdleMode } from '@/hooks/useLocalStorage';
import type { TaskLink, TaskPosition } from '@/types';

import { positionToEndCell, positionToStartCell } from '@/lib/planner-timeline/occupancyUtils';

import { TASK_ARROWS_DEV_QA_LINK_PREFIX } from './taskArrowsHelpers';

type TaskLinkLike = Pick<TaskLink, 'fromTaskId' | 'id' | 'origin' | 'relationship' | 'toTaskId'>;

/** Пара «кто блокирует → кого блокирует» для связей-зависимостей; иначе null. */
function resolveTaskLinkBlockerPair(
  link: TaskLinkLike
): { blockedId: string; blockerId: string } | null {
  if (link.relationship === 'blocks') {
    return { blockerId: link.fromTaskId, blockedId: link.toTaskId };
  }
  if (link.relationship === 'blocked_by') {
    return { blockerId: link.toTaskId, blockedId: link.fromTaskId };
  }
  return null;
}

/** Блокирующая задача по плану заканчивается позже, чем начинается заблокированная. */
export function isTaskLinkScheduleViolated(
  link: TaskLinkLike,
  taskPositions: Map<string, TaskPosition> | undefined
): boolean {
  const pair = resolveTaskLinkBlockerPair(link);
  if (!pair || !taskPositions) return false;
  const blocker = taskPositions.get(pair.blockerId);
  const blocked = taskPositions.get(pair.blockedId);
  if (!blocker || !blocked) return false;
  return positionToEndCell(blocker) > positionToStartCell(blocked);
}

/**
 * Важная связь видна без наведения в режиме `important`: блокировки и стрелки,
 * нарисованные в планере вручную. `relates`/`duplicates`/свои фразы трекера и dev → QA — нет.
 */
function isImportantTaskLink(link: TaskLinkLike): boolean {
  if (link.id.startsWith(TASK_ARROWS_DEV_QA_LINK_PREFIX)) return false;
  if (link.origin !== 'tracker') return true;
  return resolveTaskLinkBlockerPair(link) != null;
}

export function isTaskLinkVisibleWhenIdle(
  link: TaskLinkLike,
  mode: SwimlaneLinksIdleMode,
  taskPositions: Map<string, TaskPosition> | undefined
): boolean {
  if (mode === 'all') return true;
  if (isTaskLinkScheduleViolated(link, taskPositions)) return true;
  return mode === 'important' && isImportantTaskLink(link);
}

/**
 * Сколько скрытых в покое связей у каждой карточки — для бейджа «+N».
 * dev → QA не считаем: они есть почти у каждой задачи и бейдж стал бы новым шумом.
 */
export function countHiddenIdleLinksByTaskId(hiddenLinks: TaskLinkLike[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const link of hiddenLinks) {
    if (link.id.startsWith(TASK_ARROWS_DEV_QA_LINK_PREFIX)) continue;
    for (const taskId of [link.fromTaskId, link.toTaskId]) {
      counts.set(taskId, (counts.get(taskId) ?? 0) + 1);
    }
  }
  return counts;
}

/** Делит связи вне hover-кластера на видимые в покое и скрытые до наведения. */
export function partitionIdleTaskLinks<T extends TaskLinkLike>(
  links: T[],
  mode: SwimlaneLinksIdleMode,
  taskPositions: Map<string, TaskPosition> | undefined
): { hidden: T[]; shown: T[] } {
  const shown: T[] = [];
  const hidden: T[] = [];
  for (const link of links) {
    (isTaskLinkVisibleWhenIdle(link, mode, taskPositions) ? shown : hidden).push(link);
  }
  return { hidden, shown };
}
