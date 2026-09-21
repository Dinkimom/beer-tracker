import type { DeveloperHeaderLaneLabelItem } from '@/features/swimlane/components/DeveloperHeaderLaneLabels';
import type { AvailabilityCardKind } from '@/features/swimlane/utils/availabilityCardKind';
import type { AvailabilitySegment } from '@/features/swimlane/utils/availabilitySegments';
import type { SwimlaneInProgressFactSegment } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import type { SwimlanePlacementTool } from '@/lib/layers';
import type { Task } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { CALENDAR_BUSY_LANE_HEIGHT_PX } from '@/features/swimlane/components/SwimlaneCalendarBusyLane';
import {
  resolveSwimlaneQuickAddPlacementFootprint,
  resolveSwimlaneQuickAddRowGrowLayers,
} from '@/features/swimlane/components/swimlaneQuickAddPreviewAppearance';
import { getSegmentsForDeveloper } from '@/features/swimlane/utils/availabilitySegments';
import {
  buildUnavailableDayHatchKinds,
  buildUnavailableDayTitles,
  isoDateOnlyFromWorkingDayIndex,
} from '@/features/swimlane/utils/availabilityTimelineMarks';
import { getVisibleSwimlaneFactLayerHeightPx } from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactLayerHelpers';

export function buildSwimlaneRootClassName(sidebarClickEnabled: boolean): string {
  const interactive = sidebarClickEnabled ? 'cursor-pointer' : '';
  return `group/swimlane relative border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 swimlane-row-resizing:pointer-events-none ${interactive}`;
}

export function createSwimlaneRootClickHandler(
  sidebarClickEnabled: boolean,
  onCloseSidebar?: () => void
): ((e: React.MouseEvent) => void) | undefined {
  if (!sidebarClickEnabled || !onCloseSidebar) return undefined;
  return (e) => {
    if (shouldCloseSidebarOnSwimlaneClick(e.target as HTMLElement)) {
      onCloseSidebar();
    }
  };
}

export function resolveSwimlaneFactExtra(
  swimlaneFactTimelineEnabled: boolean,
  swimlaneInProgressDurations: SwimlaneInProgressFactSegment[],
  sprintStartDate: Date,
  timelineTotalParts: number
): number {
  if (!swimlaneFactTimelineEnabled || swimlaneInProgressDurations.length === 0) return 0;
  return getVisibleSwimlaneFactLayerHeightPx(
    swimlaneInProgressDurations,
    sprintStartDate,
    timelineTotalParts
  );
}

export function resolveSwimlaneAvailabilityTimeline(input: {
  boardEvents: BoardAvailabilityEvent[] | undefined;
  developerId: string;
  sprintStartDate: Date;
  sprintTimelineWorkingDays: number;
  titleForKind: (kind: AvailabilityCardKind) => string;
}): {
  availabilitySegments: AvailabilitySegment[];
  unavailableDayHatchKinds: Map<number, AvailabilityCardKind>;
  unavailableDayTitles: Map<number, string>;
} {
  const availabilitySegments = input.boardEvents?.length
    ? getSegmentsForDeveloper(
        input.developerId,
        input.sprintStartDate,
        input.boardEvents,
        input.sprintTimelineWorkingDays
      )
    : [];
  return {
    availabilitySegments,
    unavailableDayHatchKinds: buildUnavailableDayHatchKinds(availabilitySegments),
    unavailableDayTitles: buildUnavailableDayTitles(availabilitySegments, input.titleForKind),
  };
}

export function resolveSwimlaneSecondaryLaneLayout(input: {
  calendarBusySegmentCount: number;
  calendarBusyVisible: boolean;
  calendarLabel: string;
  factExtra: number;
  factLabel: string;
  taskBandHeight: number;
}): {
  calendarBusyLaneVisible: boolean;
  laneLabels: DeveloperHeaderLaneLabelItem[];
  mainAreaHeight: number;
  timelineOuterHeight: number;
} {
  const calendarBusyLaneVisible =
    input.calendarBusyVisible && input.calendarBusySegmentCount > 0;
  const calendarBusyLaneHeightPx = calendarBusyLaneVisible
    ? CALENDAR_BUSY_LANE_HEIGHT_PX
    : 0;
  const mainAreaHeight = input.taskBandHeight + input.factExtra;
  const laneLabels: DeveloperHeaderLaneLabelItem[] = [];
  if (input.factExtra > 0) {
    laneLabels.push({
      accent: 'fact',
      heightPx: input.factExtra,
      label: input.factLabel,
      topPx: input.taskBandHeight,
    });
  }
  if (calendarBusyLaneVisible) {
    laneLabels.push({
      accent: 'calendar',
      heightPx: calendarBusyLaneHeightPx,
      label: input.calendarLabel,
      topPx: mainAreaHeight,
    });
  }
  return {
    calendarBusyLaneVisible,
    laneLabels,
    mainAreaHeight,
    timelineOuterHeight: mainAreaHeight + calendarBusyLaneHeightPx,
  };
}

function shouldCloseSidebarOnSwimlaneClick(target: HTMLElement): boolean {
  return (
    !target.closest('[data-task-id]') &&
    !target.closest('[data-comment-id]') &&
    !target.closest('[data-swimlane-row-border-resize]') &&
    !target.closest('button') &&
    !target.closest('a') &&
    !target.closest('[role="button"]') &&
    !target.closest('.pointer-events-none')
  );
}

export function resolveSwimlaneHideQuickAddPreview(input: {
  canQuickAddOnLane: boolean;
  hasQuickAddDraftMode: boolean;
  isDraggingTask: boolean;
  isLinking: boolean;
}): boolean {
  return (
    !input.canQuickAddOnLane ||
    input.hasQuickAddDraftMode ||
    input.isDraggingTask ||
    input.isLinking
  );
}

export function resolveSwimlaneQuickAddLayoutState(input: {
  canQuickAddOnLane: boolean;
  hoverPreview: { layer: number; span: number } | null;
  isDraggingTask: boolean;
  isLinking: boolean;
  noteComposer?: { taskId: string } | null;
  placementTool: SwimlanePlacementTool;
  tasks: Iterable<Pick<Task, 'id' | 'isLocalTask'>>;
}): {
  hasQuickAddDraftMode: boolean;
  hideQuickAddPreview: boolean;
  hoverMinTaskLayers?: number;
  previewSpanLayers?: number;
  quickAddFootprint: { durationCells: number; span: number };
} {
  const hasQuickAddDraftMode = resolveSwimlaneHasQuickAddDraftMode(
    input.tasks,
    input.noteComposer
  );
  const hideQuickAddPreview = resolveSwimlaneHideQuickAddPreview({
    canQuickAddOnLane: input.canQuickAddOnLane,
    hasQuickAddDraftMode,
    isDraggingTask: input.isDraggingTask,
    isLinking: input.isLinking,
  });
  return {
    hasQuickAddDraftMode,
    hideQuickAddPreview,
    quickAddFootprint: resolveSwimlaneQuickAddPlacementFootprint(
      input.placementTool === 'image' || input.placementTool === 'diagram'
    ),
    ...resolveSwimlaneQuickAddRowGrowLayers({
      hideQuickAddPreview,
      hoverPreview: input.hoverPreview,
    }),
  };
}

export function resolveSwimlaneHasQuickAddDraftMode(
  tasks: Iterable<Pick<Task, 'id' | 'isLocalTask'>>,
  noteComposer?: { taskId: string } | null
): boolean {
  if (noteComposer != null) {
    return true;
  }
  for (const task of tasks) {
    if (task.isLocalTask === true && parseSwimlaneCommentTaskId(task.id) == null) {
      return true;
    }
  }
  return false;
}

function buildQuickAddCellHandler(
  onCreateTaskInCell: ((args: { assigneeId: string; day: number; part: number }) => Promise<void> | void) | undefined,
  hasQuickAddDraftMode: boolean,
  developerId: string
): ((args: { day: number; part: number }) => void) | undefined {
  if (!onCreateTaskInCell || hasQuickAddDraftMode) return undefined;
  return ({ day, part }) => {
    void onCreateTaskInCell({ assigneeId: developerId, day, part });
  };
}

export function buildSwimlanePlacementQuickAddHandler(input: {
  canQuickAddOnLane: boolean;
  developerId: string;
  hasQuickAddDraftMode: boolean;
  placementTool: SwimlanePlacementTool;
  sprintStartDate: Date;
  sprintTimelineWorkingDays: number;
  onCreateTaskInCell?: (args: {
    assigneeId: string;
    day: number;
    part: number;
  }) => Promise<void> | void;
  onOpenAvailabilityForDate?: (startDate: string) => void;
}): ((args: { day: number; part: number }) => void) | undefined {
  if (
    !input.canQuickAddOnLane ||
    input.hasQuickAddDraftMode ||
    input.placementTool === 'cursor' ||
    input.placementTool === 'link'
  ) {
    return undefined;
  }
  if (input.placementTool === 'availability') {
    const openAvailability = input.onOpenAvailabilityForDate;
    if (!openAvailability) {
      return undefined;
    }
    return ({ day }) => {
      const startDate = isoDateOnlyFromWorkingDayIndex(
        input.sprintStartDate,
        day,
        input.sprintTimelineWorkingDays
      );
      if (startDate) {
        openAvailability(startDate);
      }
    };
  }
  return buildQuickAddCellHandler(
    input.onCreateTaskInCell,
    input.hasQuickAddDraftMode,
    input.developerId
  );
}
