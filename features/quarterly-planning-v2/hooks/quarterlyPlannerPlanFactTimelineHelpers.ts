import type { QuarterlyPlannerAddEventMenuState } from '../components/planner/plan/QuarterlyPlannerAddEventMenu';
import type { QuarterlyPlannerAddPhaseMenuState } from '../components/planner/plan/QuarterlyPlannerAddPhaseMenu';
import type {
  QuarterlyPlanPhaseKind,
  StoryEventsByStory,
  StoryPhasePosition,
} from '../types';
import type { TaskPosition } from '@/types';

import { isCellOccupiedByTask } from '@/features/sprint/utils/occupancyUtils';

import { storyPhaseOverlapsAny } from '../utils/quarterlyPhaseWeekRange';
import { readCellMenuAnchor } from '../utils/quarterlyPlannerCellMenuAnchor';
import { getStoryEventForWeek } from '../utils/storyEventsMap';
import { storyPhaseToTaskPosition, taskPositionToStoryPhase } from '../utils/storyPhasePositions';
import {
  createQuarterlyPhaseId,
  defaultQuarterlyPhaseAtWeek,
} from '../utils/storyPhasesMap';

interface WeekPosition { phase: StoryPhasePosition; weekPos: TaskPosition }
type ToWeekPosition = (position: TaskPosition) => TaskPosition;

export function buildQuarterlyPlanWeekPositions(
  phases: StoryPhasePosition[],
  storyKey: string,
  toWeekPosition: ToWeekPosition
): WeekPosition[] {
  return phases.map((phase) => ({
    phase,
    weekPos: toWeekPosition(storyPhaseToTaskPosition(storyKey, phase)),
  }));
}

export function isQuarterlyPlanWeekOccupied(
  weekIndex: number,
  weekPositions: WeekPosition[]
): boolean {
  return weekPositions.some(({ weekPos }) => isCellOccupiedByTask(weekIndex, 0, weekPos, 1));
}

export function tryAddQuarterlyPlanPhase(params: {
  canAddDelivery: boolean;
  canAddDiscovery: boolean;
  kind: QuarterlyPlanPhaseKind;
  phases: StoryPhasePosition[];
  storyKey: string;
  toWeekPosition: ToWeekPosition;
  updatePhases: (next: StoryPhasePosition[]) => void;
  weekIndex: number;
}): boolean {
  const {
    canAddDelivery,
    canAddDiscovery,
    kind,
    phases,
    storyKey,
    toWeekPosition,
    updatePhases,
    weekIndex,
  } = params;
  if (kind === 'delivery' && !canAddDelivery) return false;
  if (kind === 'discovery' && !canAddDiscovery) return false;

  const candidate: StoryPhasePosition = {
    ...defaultQuarterlyPhaseAtWeek(weekIndex, kind),
    id: createQuarterlyPhaseId(),
  };
  if (storyPhaseOverlapsAny(storyKey, candidate, phases, toWeekPosition)) {
    return false;
  }
  updatePhases([...phases, candidate]);
  return true;
}

export function trySaveQuarterlyPlanPhasePosition(params: {
  phase: StoryPhasePosition;
  phases: StoryPhasePosition[];
  position: TaskPosition;
  storyKey: string;
  toWeekPosition: ToWeekPosition;
  updatePhases: (next: StoryPhasePosition[]) => void;
}): boolean {
  const { phase, phases, position, storyKey, toWeekPosition, updatePhases } = params;
  const updated = taskPositionToStoryPhase(position, phase.kind, phase.id);
  const others = phases.filter((p) => p.id !== phase.id);
  if (storyPhaseOverlapsAny(storyKey, updated, others, toWeekPosition)) {
    return false;
  }
  updatePhases(phases.map((p) => (p.id === phase.id ? updated : p)));
  return true;
}

export function buildQuarterlyEventPlacementContext(
  weekIndex: number,
  weekPositions: WeekPosition[],
  storyEventsByStory: StoryEventsByStory,
  storyKey: string
) {
  return {
    weekIndex,
    weekPositions,
    existingEvent: getStoryEventForWeek(storyEventsByStory, storyKey, weekIndex),
  };
}

export function createQuarterlyEventMenuState(
  weekIndex: number,
  anchorEl: HTMLElement,
  storyEventsByStory: StoryEventsByStory,
  storyKey: string
): QuarterlyPlannerAddEventMenuState {
  const hasEvent = getStoryEventForWeek(storyEventsByStory, storyKey, weekIndex) != null;
  return { weekIndex, hasEvent, ...readCellMenuAnchor(anchorEl) };
}

export function createQuarterlyAddPhaseMenuState(
  weekIndex: number,
  anchorEl: HTMLElement
): QuarterlyPlannerAddPhaseMenuState {
  return { weekIndex, ...readCellMenuAnchor(anchorEl) };
}

export function observeQuarterlyPlanFactRowHeight(
  el: HTMLDivElement,
  setRowHeightPx: (height: number) => void
): () => void {
  const syncHeight = () => {
    const next = el.clientHeight;
    if (next > 0) {
      setRowHeightPx(next);
    }
  };

  syncHeight();
  const observer = new ResizeObserver(syncHeight);
  observer.observe(el);
  return () => observer.disconnect();
}

export function quarterlyPlanFactCellWidthStyle(
  weekColumnWidth: number | undefined,
  weekCount: number
): { minWidth: number | undefined; width: number | string } {
  return {
    width: weekColumnWidth ?? `${100 / weekCount}%`,
    minWidth: 0,
  };
}
