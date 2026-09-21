import type { TaskPosition } from '@/types';

import { positionToEndCell, positionToStartCell } from '@/features/sprint/utils/occupancyUtils';

export function findRightmostTaskIdInRow(
  taskIds: string[],
  taskPositions: Map<string, TaskPosition>
): string | null {
  let maxEnd = -1;
  let result: string | null = null;
  for (const id of taskIds) {
    const pos = taskPositions.get(id);
    if (!pos) continue;
    const end = positionToEndCell(pos);
    if (end > maxEnd) {
      maxEnd = end;
      result = id;
    }
  }
  return result;
}

export function findLeftmostTaskIdInRow(
  taskIds: string[],
  taskPositions: Map<string, TaskPosition>
): string | null {
  let minStart = Infinity;
  let result: string | null = null;
  for (const id of taskIds) {
    const pos = taskPositions.get(id);
    if (!pos) continue;
    const start = positionToStartCell(pos);
    if (start < minStart) {
      minStart = start;
      result = id;
    }
  }
  return result;
}
