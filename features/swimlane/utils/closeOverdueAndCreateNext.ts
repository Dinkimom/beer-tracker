import type { TransitionItem } from '@/lib/api/types';
import type { TaskPosition } from '@/types';

import { mapStatus } from '@/utils/statusMapper';

function isDoneTransition(item: TransitionItem): boolean {
  const typeKey = item.to?.statusTypeKey?.trim().toLowerCase();
  if (typeKey === 'done') return true;
  const statusKey = item.to?.key?.trim();
  return statusKey ? mapStatus(statusKey) === 'done' : false;
}

/** Переход в закрывающий статус. Без экранных полей предпочтительнее. */
export function pickDoneTransition(transitions: readonly TransitionItem[]): TransitionItem | null {
  const done = transitions.filter(isDoneTransition);
  if (done.length === 0) return null;
  return done.find((item) => !item.screen?.id) ?? done[0] ?? null;
}

/**
 * Новая задача стартует с текущей ячейки и занимает один день,
 * не выходя за конец таймлайна.
 */
export function buildNextPlanPosition(
  source: TaskPosition,
  currentCell: number,
  partsPerDay: number,
  timelineTotalParts: number,
  taskId: string
): TaskPosition | null {
  if (partsPerDay <= 0 || currentCell < 0 || currentCell >= timelineTotalParts) return null;
  const duration = Math.min(partsPerDay, timelineTotalParts - currentCell);
  if (duration <= 0) return null;
  return {
    assignee: source.assignee,
    duration,
    startDay: Math.floor(currentCell / partsPerDay),
    startPart: currentCell % partsPerDay,
    taskId,
  };
}
