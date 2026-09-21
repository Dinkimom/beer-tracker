import type { StoryPhasePosition } from '../types';
import type { TaskPosition } from '@/types';

import { weekCountFromColumnPosition } from './quarterlyWeekPositions';
import { storyPhaseToTaskPosition } from './storyPhasePositions';

interface WeekRange {
  endWeek: number;
  startWeek: number;
}

/** Диапазон фазы в индексах недельных колонок (после toWeekPosition). */
export function storyPhaseWeekRange(
  storyKey: string,
  phase: StoryPhasePosition,
  toWeekPosition: (pos: TaskPosition) => TaskPosition
): WeekRange {
  const weekPos = toWeekPosition(storyPhaseToTaskPosition(storyKey, phase));
  const startWeek = weekPos.startDay;
  const endWeek = startWeek + weekCountFromColumnPosition(weekPos) - 1;
  return { startWeek, endWeek };
}

export function weekRangesOverlap(a: WeekRange, b: WeekRange): boolean {
  return a.startWeek <= b.endWeek && b.startWeek <= a.endWeek;
}

export function storyPhaseOverlapsAny(
  storyKey: string,
  candidate: StoryPhasePosition,
  others: StoryPhasePosition[],
  toWeekPosition: (pos: TaskPosition) => TaskPosition
): boolean {
  const candidateRange = storyPhaseWeekRange(storyKey, candidate, toWeekPosition);
  return others.some((other) =>
    weekRangesOverlap(candidateRange, storyPhaseWeekRange(storyKey, other, toWeekPosition))
  );
}
