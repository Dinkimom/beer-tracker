import type { TaskPosition } from '@/types';

import { getPositionSegmentRanges } from '@/lib/planner-timeline';

/** На сколько ячеек план вылезает за последнюю ячейку таймлайна. 0 — всё внутри сетки. */
export function timelineOverflowCellCount(
  positions: Iterable<TaskPosition>,
  totalCells: number
): number {
  if (totalCells <= 0) return 0;
  let overflow = 0;
  for (const position of positions) {
    for (const range of getPositionSegmentRanges(position)) {
      const past = range.endCell - totalCells;
      if (past > overflow) overflow = past;
    }
  }
  return overflow;
}
