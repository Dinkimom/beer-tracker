import type { SwimlanesSectionProps } from './SwimlanesSection.types';
import type { SwimlaneInProgressFactSegment } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import type { CalendarBusySegment } from '@/lib/calendar/calendarEventTypes';
import type { OccupancyErrorReason } from '@/lib/planner-timeline';
import type { Comment, Developer, TaskPosition } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { useCallback, useMemo } from 'react';
import { Xwrapper } from 'react-xarrows';

import { WORKING_DAYS, ZIndex } from '@/constants';
import { DAYS_HEADER_ROW_HEIGHT_PX } from '@/features/sprint/components/DaysHeader';
import { FeatureLaneAddRow } from '@/features/sprint/components/SprintPlanner/feature-lanes/FeatureLaneAddRow';
import {
  partitionPinnedSwimlaneRows,
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

interface SwimlanesSectionLanesProps {
  calendarBusyByDeveloper: Map<string, CalendarBusySegment[]>;
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
  const pinnedIdSet = useMemo(() => new Set(pinnedRowIds), [pinnedRowIds]);
  const togglePinnedRow = useCallback(
    (assigneeId: string) => {
      setPinnedRowIds((prev) => togglePinnedSwimlaneRowId(prev, assigneeId));
    },
    [setPinnedRowIds]
  );

  const showLinks = section.showLinks !== false;
  const linksDimOnHover = section.linksDimOnHover !== false;

  const renderLane = (developer: Developer) => (
    <Swimlane
      key={developer.id}
      isPinned={pinnedIdSet.has(developer.id)}
      onTogglePin={togglePinnedRow}
      {...buildSwimlanePropsForDeveloper({
        activeDraggableId: section.dragAndDrop.activeDraggableId,
        activeTask: resolveSwimlaneActiveTask(
          section.dragAndDrop.activeTaskId,
          section.allTasksForDrag
        ),
        activeTaskDuration: section.dragAndDrop.activeTaskDuration,
        boardId: section.boardId,
        calendarBusySegments: calendarBusyByDeveloper.get(developer.id) ?? [],
        calendarBusyVisible: Boolean(section.swimlaneCalendarBusyEnabled),
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
      })}
    />
  );

  return (
    <Xwrapper>
      <SwimlaneXarrowRedrawProvider>
        {pinnedRows.length > 0 ? (
          <div
            className="sticky bg-white shadow-[0_4px_8px_-4px_rgba(15,23,42,0.18)] dark:bg-gray-800 dark:shadow-[0_4px_8px_-4px_rgba(0,0,0,0.45)]"
            data-pinned-swimlanes
            style={{ top: DAYS_HEADER_ROW_HEIGHT_PX, zIndex: ZIndex.stickyPinnedRows }}
          >
            {pinnedRows.map(renderLane)}
          </div>
        ) : null}
        {unpinnedRows.map(renderLane)}
        <FeatureLaneAddRow participantsColumnWidth={section.participantsColumnWidth} />
        {showLinks && (
          <TaskArrows
            activeTaskId={section.dragAndDrop.activeTaskId}
            hoveredTaskId={hoveredTaskId}
            linkToolArmed={linkToolArmed}
            linkingFromTaskId={linkingFromTaskId}
            linkingSessionActive={linkingSessionActive}
            qaTasksMap={section.qaTasksMap}
            segmentEditTaskId={segmentEditTaskId}
            taskLinks={section.filteredTaskLinks}
            taskPositions={swimlanePositions}
            tasks={section.allTasksForDrag}
            visibleDeveloperIds={visibleSwimlaneAssigneeIds}
            onDeleteLink={section.onDeleteLink}
            onTaskHoverEnd={onTaskHoverEnd}
          />
        )}
      </SwimlaneXarrowRedrawProvider>
    </Xwrapper>
  );
}
