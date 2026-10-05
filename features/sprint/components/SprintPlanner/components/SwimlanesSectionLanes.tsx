import type { SwimlanesSectionProps } from './SwimlanesSection.types';
import type { SwimlaneInProgressFactSegment } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import type { CalendarBusySegment } from '@/lib/calendar/calendarEventTypes';
import type { OccupancyErrorReason } from '@/lib/planner-timeline';
import type { Comment, Developer, TaskPosition } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { Xwrapper } from 'react-xarrows';

import { WORKING_DAYS, ZIndex } from '@/constants';
import { SwimlanePinnedArrowSync } from '@/features/sprint/components/SprintPlanner/components/SwimlanePinnedArrowSync';
import { FeatureLaneAddRow } from '@/features/sprint/components/SprintPlanner/feature-lanes/FeatureLaneAddRow';
import { PlannerNowLine } from '@/features/sprint/components/SprintPlanner/layout/PlannerNowLine';
import {
  applyPinnedSwimlaneFrameTops,
  partitionPinnedSwimlaneRows,
  syncPinnedSwimlaneFrames,
  togglePinnedSwimlaneRowId,
} from '@/features/sprint/components/SprintPlanner/utils/swimlanesSectionHelpers';
import {
  buildSwimlanePropsForDeveloper,
  resolveSwimlaneActiveTask,
  resolveSwimlaneHoveredCellForDeveloper,
} from '@/features/sprint/components/SprintPlanner/utils/swimlanesSectionSwimlanePropsHelpers';
import { Swimlane } from '@/features/swimlane/components/Swimlane';
import { TaskArrows } from '@/features/swimlane/components/task-arrows';
import { SwimlaneXarrowRedrawProvider } from '@/features/swimlane/SwimlaneArrowRedrawContext';
import { useSwimlanePinnedRowIdsStorage } from '@/hooks/useLocalStorage';
import { taskLinksForOnboardingArrows } from '@/lib/plannerOnboarding/onboardingDemoLane';

function useStableElementRefMap() {
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const callbacks = useRef(new Map<string, (node: HTMLDivElement | null) => void>());
  const refFor = useCallback((id: string) => {
    const cached = callbacks.current.get(id);
    if (cached) return cached;
    const callback = (node: HTMLDivElement | null) => {
      if (node) nodes.current.set(id, node);
      else nodes.current.delete(id);
    };
    callbacks.current.set(id, callback);
    return callback;
  }, []);
  return { nodes, refFor };
}

function usePinnedSwimlaneFrameTops(
  pinnedIdKey: string,
  frameNodes: { readonly current: Map<string, HTMLDivElement> },
  onLaidOutRef: { readonly current: (() => void) | null }
) {
  useLayoutEffect(() => {
    const pinnedIds = JSON.parse(pinnedIdKey) as string[];
    const pinnedFrames = syncPinnedSwimlaneFrames(frameNodes.current, pinnedIds);
    if (pinnedFrames.length > 0) onLaidOutRef.current?.();
    if (pinnedFrames.length === 0) return undefined;
    const observer = new ResizeObserver(() => {
      applyPinnedSwimlaneFrameTops(pinnedFrames);
      onLaidOutRef.current?.();
    });
    for (const frame of pinnedFrames) observer.observe(frame);
    return () => observer.disconnect();
  }, [frameNodes, onLaidOutRef, pinnedIdKey]);
}

interface SwimlanesSectionLanesProps {
  calendarBusyByDeveloper: Map<string, CalendarBusySegment[]>;
  cardShadowTaskId: string | null;
  comments: Comment[];
  contextMenuTaskId: string | null;
  developerAvailabilityMap: Map<string, { boardEvents: BoardAvailabilityEvent[] }>;
  effectiveFactHoveredTaskId: string | null;
  errorReasons: Map<string, OccupancyErrorReason[]>;
  errorTaskIds: Set<string>;
  globalNameFilter: string;
  holidayDayIndices: Set<number>;
  hoverConnectedTaskIds: Set<string> | null;
  hoveredTaskId: string | null;
  linkingFromTaskId: string | null;
  linkingSessionActive: boolean;
  /** Капсула «Связь» в тулбаре — крестики удаления не показываем. */
  linkToolArmed?: boolean;
  section: SwimlanesSectionProps;
  segmentEditTaskId: string | null;
  sourceLinkEndCell: number | null;
  swimlaneFactDeveloperMap: Map<string, Developer>;
  swimlaneInProgressFactSegmentsByDev: Map<string, SwimlaneInProgressFactSegment[]>;
  swimlanePositions: Map<string, TaskPosition>;
  swimlaneRows: Developer[];
  visibleSwimlaneAssigneeIds: Set<string>;
  onFactSegmentHover: (taskId: string | null) => void;
  onSegmentEditCancel: () => void;
  onTaskClick: (taskId: string) => void;
  onTaskHover: (taskId: string | null) => void;
  onTaskHoverEnd: () => void;
}

export function SwimlanesSectionLanes({
  calendarBusyByDeveloper,
  cardShadowTaskId,
  comments,
  contextMenuTaskId,
  developerAvailabilityMap,
  effectiveFactHoveredTaskId,
  errorReasons,
  errorTaskIds,
  globalNameFilter,
  holidayDayIndices,
  hoverConnectedTaskIds,
  hoveredTaskId,
  linkToolArmed = false,
  linkingFromTaskId,
  linkingSessionActive,
  section,
  segmentEditTaskId,
  sourceLinkEndCell,
  swimlaneFactDeveloperMap,
  swimlaneInProgressFactSegmentsByDev,
  swimlanePositions,
  swimlaneRows,
  visibleSwimlaneAssigneeIds,
  onFactSegmentHover,
  onSegmentEditCancel,
  onTaskClick,
  onTaskHover,
  onTaskHoverEnd,
}: SwimlanesSectionLanesProps) {
  const [pinnedRowIds, setPinnedRowIds] = useSwimlanePinnedRowIdsStorage();
  const { pinned: pinnedRows, unpinned: unpinnedRows } = useMemo(
    () => partitionPinnedSwimlaneRows(swimlaneRows, pinnedRowIds),
    [pinnedRowIds, swimlaneRows]
  );
  const orderedRows = useMemo(
    () => [...pinnedRows, ...unpinnedRows],
    [pinnedRows, unpinnedRows]
  );
  const pinnedIdKey = JSON.stringify(pinnedRows.map((row) => row.id));
  const rowsLayoutKey = `${pinnedIdKey}|${orderedRows.map((row) => row.id).join('|')}`;
  const { nodes: frameNodes, refFor: frameRefFor } = useStableElementRefMap();
  const pinnedFrameArrowRedrawRef = useRef<(() => void) | null>(null);
  usePinnedSwimlaneFrameTops(pinnedIdKey, frameNodes, pinnedFrameArrowRedrawRef);
  const pinnedIdSet = useMemo(() => new Set(pinnedRowIds), [pinnedRowIds]);
  const togglePinnedRow = useCallback(
    (assigneeId: string) => {
      setPinnedRowIds((prev) => togglePinnedSwimlaneRowId(prev, assigneeId));
    },
    [setPinnedRowIds]
  );

  const showLinks = section.showLinks !== false;
  const linksDimOnHover = section.linksDimOnHover !== false;
  const arrowTaskLinks = taskLinksForOnboardingArrows(showLinks, section.filteredTaskLinks);

  const swimlanePropsById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildSwimlanePropsForDeveloper>>();
    for (const developer of swimlaneRows) {
      map.set(developer.id, buildSwimlanePropsForDeveloper({
        activeDraggableId: section.dragAndDrop.activeDraggableId,
        activeTask: resolveSwimlaneActiveTask(
          section.dragAndDrop.activeTaskId,
          section.allTasksForDrag
        ),
        activeTaskDuration: section.dragAndDrop.activeTaskDuration,
        boardId: section.boardId,
        calendarBusySegments: calendarBusyByDeveloper.get(developer.id) ?? [],
        calendarBusyVisible: Boolean(section.swimlaneCalendarBusyEnabled),
        cardShadowTaskId,
        comments,
        commentsVisible: section.commentsVisible,
        contextMenuBlurOtherCards: section.contextMenuBlurOtherCards ?? false,
        contextMenuTaskId,
        developer,
        developerAvailability: developerAvailabilityMap.get(developer.id),
        developers: section.developers,
        dragAndDropIsDraggingTask: section.dragAndDrop.isDraggingTask,
        effectiveFactHoveredTaskId,
        errorReasons,
        errorTaskIds,
        globalNameFilter,
        holidayDayIndices,
        hoverConnectedTaskIds:
          showLinks && linksDimOnHover && !linkingSessionActive
            ? hoverConnectedTaskIds
            : null,
        hoveredCell: resolveSwimlaneHoveredCellForDeveloper(
          section.dragAndDrop.hoveredCell,
          developer.id
        ),
        hoveredTaskId,
        linkingFromTaskId: showLinks ? linkingFromTaskId : null,
        linkSourceEndCell: showLinks ? sourceLinkEndCell : null,
        onCancelQuickAddDraft: section.onCancelQuickAddDraft,
        onCloseSidebar: section.onCloseSidebar,
        onCommentCreate: section.onCommentCreate,
        onCommentCardRowLayoutUpdate: section.onCommentCardRowLayoutUpdate,
        onCommentApprove: section.onCommentApprove,
        onCommentDelete: section.onCommentDelete,
        onCommentUpdate: section.onCommentUpdate,
        onContextMenu: section.onContextMenu,
        onCreateQATask: section.onCreateQATask,
        onCreateTaskInCell: section.onCreateTaskInCell,
        onOverdueCloseAndCreate: section.onOverdueCloseAndCreate,
        onFactSegmentHover,
        onPasteQuickAddNote: section.onPasteQuickAddNote,
        onQuickAddDraftAssigneeChange: section.onQuickAddDraftAssigneeChange,
        onQuickAddDraftCommentColorChange: section.onQuickAddDraftCommentColorChange,
        onQuickAddDraftImageUrlChange: section.onQuickAddDraftImageUrlChange,
        onQuickAddDraftKindChange: section.onQuickAddDraftKindChange,
        onQuickAddDraftParentChange: section.onQuickAddDraftParentChange,
        onQuickAddDraftQueueChange: section.onQuickAddDraftQueueChange,
        onQuickAddDraftTitleChange: section.onQuickAddDraftTitleChange,
        onQuickAddDraftTypeChange: section.onQuickAddDraftTypeChange,
        onSegmentEditCancel,
        onSegmentEditSave: section.onSegmentEditSave,
        onSelectExistingQuickAddDraft: section.onSelectExistingQuickAddDraft,
        onSubmitQuickAddCommentDraft: section.onSubmitQuickAddCommentDraft,
        onSubmitQuickAddDiagramDraft: section.onSubmitQuickAddDiagramDraft,
        onSubmitQuickAddDraft: section.onSubmitQuickAddDraft,
        onSubmitQuickAddImageDraft: section.onSubmitQuickAddImageDraft,
        onTaskClick,
        onTaskHover,
        onTaskResize: section.onTaskResize,
        participantsColumnWidth: section.participantsColumnWidth,
        qaTasksMap: section.qaTasksMap,
        quickAddBoardId: section.quickAddBoardId ?? null,
        quickAddExcludedIssueKeys: section.quickAddExcludedIssueKeys,
        quickAddParentSelectOptions: section.quickAddParentSelectOptions,
        quickAddQueueOptions: section.quickAddQueueOptions ?? [],
        quickAddSubmittingTaskId: section.quickAddSubmittingTaskId ?? null,
        segmentEditTaskId,
        selectedSprintId: section.selectedSprintId,
        sidebarOpen: section.sidebarOpen,
        sidebarWidth: section.sidebarWidth,
        sprintStartDate: section.sprintStartDate,
        sprintTimelineWorkingDays: section.sprintTimelineWorkingDays ?? WORKING_DAYS,
        swimlaneFactChangelogsByTaskId: section.taskChangelogsByTaskId,
        swimlaneFactCommentsByTaskId: section.taskIssueCommentsByTaskId,
        swimlaneFactDeveloperMap,
        swimlaneFactTimelineEnabled: Boolean(section.swimlaneFactTimelineEnabled),
        swimlaneImagesVisible: section.swimlaneImagesVisible,
        swimlaneInProgressDurations:
          swimlaneInProgressFactSegmentsByDev.get(developer.id) ?? [],
        swimlaneNotesVisible: section.swimlaneNotesVisible,
        taskLinks: section.filteredTaskLinks,
        taskPositions: section.taskPositions,
        tasks: section.tasksByAssignee.get(developer.id) || [],
        tasksMap: section.tasksMap,
        viewMode: section.viewMode,
      }));
    }
    return map;
  }, [
    calendarBusyByDeveloper,
    cardShadowTaskId,
    comments,
    contextMenuTaskId,
    developerAvailabilityMap,
    effectiveFactHoveredTaskId,
    errorReasons,
    errorTaskIds,
    globalNameFilter,
    holidayDayIndices,
    hoverConnectedTaskIds,
    hoveredTaskId,
    linkingFromTaskId,
    linkingSessionActive,
    linksDimOnHover,
    onFactSegmentHover,
    onSegmentEditCancel,
    onTaskClick,
    onTaskHover,
    section,
    segmentEditTaskId,
    showLinks,
    sourceLinkEndCell,
    swimlaneFactDeveloperMap,
    swimlaneInProgressFactSegmentsByDev,
    swimlaneRows,
  ]);

  const nowLineProps = {
    dayCount: section.sprintTimelineWorkingDays ?? WORKING_DAYS,
    participantsColumnWidth: section.participantsColumnWidth,
    sprintStartDate: section.sprintStartDate,
  };
  const showArrows = showLinks || arrowTaskLinks.length > 0;
  const taskArrowProps = {
    activeTaskId: section.dragAndDrop.activeTaskId,
    hoveredTaskId,
    linkToolArmed,
    linkingFromTaskId,
    linkingSessionActive,
    qaTasksMap: section.qaTasksMap,
    rowsLayoutKey,
    segmentEditTaskId,
    taskLinks: arrowTaskLinks,
    taskPositions: swimlanePositions,
    tasks: section.allTasksForDrag,
    visibleDeveloperIds: visibleSwimlaneAssigneeIds,
    onDeleteLink: section.onDeleteLink,
    onTaskHoverEnd,
  };

  const renderLane = (developer: Developer) => {
    const laneProps = swimlanePropsById.get(developer.id);
    if (!laneProps) return null;
    const isPinned = pinnedIdSet.has(developer.id);
    return (
      <div
        key={developer.id}
        ref={frameRefFor(developer.id)}
        className={isPinned ? 'sticky planner-pinned-lane' : undefined}
        style={isPinned ? { zIndex: ZIndex.stickyPinnedRows } : undefined}
      >
        <Swimlane {...laneProps} isPinned={isPinned} onTogglePin={togglePinnedRow} />
        {isPinned ? <PlannerNowLine {...nowLineProps} /> : null}
        {isPinned && showArrows ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
            data-swimlane-arrow-clip
            style={{ zIndex: ZIndex.contentOverlay }}
          >
            {/* Общий слой стрелок под z-index закреплённой строки. */}
            <TaskArrows {...taskArrowProps} clipToRow />
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <Xwrapper>
      <SwimlaneXarrowRedrawProvider>
        <SwimlanePinnedArrowSync
          active={pinnedRows.length > 0}
          redrawRef={pinnedFrameArrowRedrawRef}
        />
        <div className="relative">
          {orderedRows.map(renderLane)}
          <FeatureLaneAddRow participantsColumnWidth={section.participantsColumnWidth} />
          <PlannerNowLine {...nowLineProps} />
        </div>
        {showArrows ? <TaskArrows {...taskArrowProps} /> : null}
      </SwimlaneXarrowRedrawProvider>
    </Xwrapper>
  );
}
