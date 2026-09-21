import type { StoryEventsByStory, StoryPhasePosition } from '../types';
import type { TaskPosition } from '@/types';

import {
  quarterlyPhaseWeekFillClass,
  quarterlyStoryEventWeekFillClass,
} from './quarterlyPlannerFillColors';
import { getPlanPhaseKindInWeek } from './quarterlyStoryEventPlacement';
import { getStoryEventForWeek } from './storyEventsMap';

/** Класс заливки для недели по фазам плана (delivery приоритетнее discovery при коллизии). */
export function planWeekFillClass(
  weekIndex: number,
  weekPositions: Array<{ phase: StoryPhasePosition; weekPos: TaskPosition }>
): string | null {
  const kind = getPlanPhaseKindInWeek(weekIndex, weekPositions);
  return kind ? quarterlyPhaseWeekFillClass(kind) : null;
}

/** Заливка недели в режиме просмотра: факт (событие) приоритетнее плана. */
export function planFactWeekFillClass(
  weekIndex: number,
  weekPositions: Array<{ phase: StoryPhasePosition; weekPos: TaskPosition }>,
  storyEventsByStory: StoryEventsByStory,
  storyKey: string
): string | null {
  const event = getStoryEventForWeek(storyEventsByStory, storyKey, weekIndex);
  if (event) {
    return quarterlyStoryEventWeekFillClass(event.kind);
  }
  return planWeekFillClass(weekIndex, weekPositions);
}
