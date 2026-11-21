import type { TaskPosition } from '@/types';

/** Та же позиция или та же геометрия плана — даты из трекера пересобирают объекты при каждом расчёте. */
function taskPositionsEqualForRetain(left: TaskPosition, right: TaskPosition): boolean {
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

/** Карты позиций с одинаковым набором и геометрией — для `equals` у computed модели: ссылка не меняется. */
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
