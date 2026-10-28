import type { TaskPosition } from '@/types';

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
