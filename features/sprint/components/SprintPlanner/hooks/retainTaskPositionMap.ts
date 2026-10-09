import type { TaskPosition } from '@/types';

/** Same object or same planner geometry — tracker-date fallbacks rebuild every render. */
export function taskPositionsEqualForRetain(left: TaskPosition, right: TaskPosition): boolean {
  if (left === right) {
    return true;
  }
  return (
    left.taskId === right.taskId &&
    left.assignee === right.assignee &&
    left.duration === right.duration &&
    left.startDay === right.startDay &&
    left.startPart === right.startPart &&
    left.plannedStartDay === right.plannedStartDay &&
    left.plannedStartPart === right.plannedStartPart &&
    left.plannedDuration === right.plannedDuration
  );
}

export function taskPositionMapsHaveSameEntries(
  left: ReadonlyMap<string, TaskPosition>,
  right: ReadonlyMap<string, TaskPosition>
): boolean {
  if (left.size !== right.size) {
    return false;
  }
  for (const [taskId, position] of left) {
    const other = right.get(taskId);
    if (!other || !taskPositionsEqualForRetain(position, other)) {
      return false;
    }
  }
  return true;
}

/** Новый Map только если набор ссылок на позиции изменился — hover не должен сбрасывать memo свимлейнов. */
export function retainTaskPositionMap(
  previous: ReadonlyMap<string, TaskPosition>,
  next: Map<string, TaskPosition>
): Map<string, TaskPosition> {
  return taskPositionMapsHaveSameEntries(previous, next) && previous instanceof Map
    ? previous
    : next;
}
