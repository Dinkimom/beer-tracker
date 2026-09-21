import type { TaskPosition } from '@/types';

export function taskPositionMapsHaveSameEntries(
  left: ReadonlyMap<string, TaskPosition>,
  right: ReadonlyMap<string, TaskPosition>
): boolean {
  if (left.size !== right.size) {
    return false;
  }
  for (const [taskId, position] of left) {
    if (right.get(taskId) !== position) {
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
