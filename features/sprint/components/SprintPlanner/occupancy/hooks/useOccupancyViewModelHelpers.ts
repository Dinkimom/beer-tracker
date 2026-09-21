import type { OccupancyViewProps } from '../OccupancyView.types';
import type { OccupancyTimelineScale } from '@/hooks/useLocalStorage';

import { PARTS_PER_DAY, WORKING_DAYS } from '@/constants';
import { QUARTERLY_STATUS_COLUMN_WIDTH_PX } from '@/features/quarterly-planning-v2/components/planner/quarterlyPlannerLayout';
import { countWorkingDaysInclusiveCalendarRange } from '@/utils/dateUtils';

export interface OccupancyLayoutResolved {
  cellsPerDayCount: 1 | 3;
  displayAsWeeks: boolean;
  effectiveFactVisible: boolean;
  legacyCompactLayout: boolean;
  plannerSidebarOpen: boolean;
  plannerSidebarWidth: number;
  quarterlyPhaseStyle: boolean;
  quarterlySplitTaskColumns: boolean;
  rowFieldsVisibility: OccupancyViewProps['occupancyLayout'] extends infer L
    ? L extends { rowFieldsVisibility?: infer R }
      ? R
      : undefined
    : undefined;
  showLinks: boolean;
  statusColumnWidth: number;
  timelineScale: OccupancyTimelineScale;
  twoLineDayHeader: boolean;
}

export function resolveOccupancyLayoutSettings(
  occupancyLayout: NonNullable<OccupancyViewProps['occupancyLayout']>,
  timelineSettings: NonNullable<OccupancyViewProps['timelineSettings']>,
  swimlaneLinksVisible: boolean,
  factVisible: boolean
): OccupancyLayoutResolved {
  const quarterlyPhaseStyle = occupancyLayout.quarterlyPhaseStyle ?? false;
  const quarterlySplitTaskColumns =
    occupancyLayout.quarterlySplitTaskColumns ?? quarterlyPhaseStyle;

  return {
    cellsPerDayCount: (occupancyLayout.cellsPerDay ?? 3) as 1 | 3,
    displayAsWeeks: occupancyLayout.displayAsWeeks ?? false,
    effectiveFactVisible: factVisible,
    legacyCompactLayout: occupancyLayout.legacyCompactLayout ?? false,
    plannerSidebarOpen: occupancyLayout.plannerSidebarOpen ?? false,
    plannerSidebarWidth: occupancyLayout.plannerSidebarWidth ?? 0,
    quarterlyPhaseStyle,
    quarterlySplitTaskColumns,
    rowFieldsVisibility: occupancyLayout.rowFieldsVisibility,
    showLinks: Boolean(timelineSettings.showLinks && swimlaneLinksVisible),
    statusColumnWidth: quarterlySplitTaskColumns ? QUARTERLY_STATUS_COLUMN_WIDTH_PX : 0,
    timelineScale: occupancyLayout.timelineScale ?? 'compact',
    twoLineDayHeader: occupancyLayout.twoLineDayHeader ?? false,
  };
}

export function computePerSprintWorkingDays(
  sprintInfos: OccupancyViewProps['sprintInfos']
): number[] | null {
  if (!sprintInfos || sprintInfos.length === 0) return null;
  return sprintInfos.map((s) => {
    const start = new Date(s.startDate);
    const end = s.endDate != null ? new Date(s.endDate) : start;
    const n = countWorkingDaysInclusiveCalendarRange(start, end);
    return n > 0 ? n : WORKING_DAYS;
  });
}

export function resolveOccupancyWorkingDays(
  perSprintWorkingDays: number[] | null,
  sprintWorkingDaysCountProp: number | undefined
): number {
  if (perSprintWorkingDays && perSprintWorkingDays.length > 0) {
    return perSprintWorkingDays.reduce((a, b) => a + b, 0);
  }
  return sprintWorkingDaysCountProp ?? WORKING_DAYS;
}

export function resolveOccupancyTimelineParts(
  cellsPerDayCount: number,
  workingDays: number,
  displayAsWeeks: boolean,
  displayColumnCount: number
): { effectiveTotalParts: number; partsPerDay: number; totalParts: number } {
  const partsPerDay = cellsPerDayCount === 1 ? 1 : PARTS_PER_DAY;
  const totalParts = workingDays * partsPerDay;
  const effectiveTotalParts = displayAsWeeks ? displayColumnCount : totalParts;
  return { effectiveTotalParts, partsPerDay, totalParts };
}

export function resolveOccupancySprintStartDate(
  sprintInfos: OccupancyViewProps['sprintInfos'],
  sprintStartDate: Date
): Date {
  return sprintInfos?.[0]?.startDate ?? sprintStartDate;
}

export function shouldLoadOccupancyTaskChangelogs(
  effectiveFactVisible: boolean,
  quarterlyPhaseStyle: boolean,
  displayAsWeeks: boolean,
  showComments: boolean | undefined
): boolean {
  const showIssueCommentsInWeeks = quarterlyPhaseStyle && displayAsWeeks && showComments;
  return Boolean(effectiveFactVisible || showIssueCommentsInWeeks);
}

export function resolveOccupancyOnSegmentEditCancel(
  usePlannerUiStore: boolean,
  setSegmentEditTaskId: (id: string | null) => void,
  onSegmentEditCancelProp: (() => void) | undefined
): (() => void) | undefined {
  if (usePlannerUiStore) {
    return () => setSegmentEditTaskId(null);
  }
  return onSegmentEditCancelProp;
}

export function toggleCollapsedParent(prev: Set<string>, parentId: string): Set<string> {
  const next = new Set(prev);
  if (next.has(parentId)) {
    next.delete(parentId);
  } else {
    next.add(parentId);
  }
  return next;
}

export function areAllParentsExpanded(parentIds: string[], collapsedParents: Set<string>): boolean {
  return parentIds.length === 0 || parentIds.every((id) => !collapsedParents.has(id));
}
