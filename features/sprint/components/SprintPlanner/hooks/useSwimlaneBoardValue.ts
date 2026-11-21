import type { SwimlanesSectionProps } from '@/features/sprint/components/SprintPlanner/components/SwimlanesSection.types';
import type { SwimlaneBoard } from '@/features/swimlane/SwimlaneBoardContext';
import type { OccupancyErrorReason } from '@/lib/planner-timeline';
import type { Developer } from '@/types';

import { useMemo } from 'react';

import { WORKING_DAYS } from '@/constants';

/**
 * Значение `SwimlaneBoardContext`. Зависимости — отдельные поля секции, а не объект `section`
 * целиком: он новый на каждый рендер секции, и тогда перерисовывались бы все дорожки.
 */
export function useSwimlaneBoardValue({
  errorReasons,
  errorTaskIds,
  globalNameFilter,
  holidayDayIndices,
  section,
  showLinks,
  swimlaneFactDeveloperMap,
  onFactSegmentHover,
  onSegmentEditCancel,
  onTaskClick,
  onTaskHover,
}: {
  errorReasons: Map<string, OccupancyErrorReason[]>;
  errorTaskIds: Set<string>;
  globalNameFilter: string;
  holidayDayIndices: Set<number>;
  section: SwimlanesSectionProps;
  showLinks: boolean;
  swimlaneFactDeveloperMap: Map<string, Developer>;
  onFactSegmentHover: (taskId: string | null) => void;
  onSegmentEditCancel: () => void;
  onTaskClick: (taskId: string) => void;
  onTaskHover: (taskId: string | null) => void;
}): SwimlaneBoard {
  const {
    boardId,
    developers,
    filteredTaskLinks,
    participantsColumnWidth,
    sprintStartDate,
    sprintTimelineWorkingDays = WORKING_DAYS,
    viewMode,
  } = section;
  const {
    commentActions,
    onCloseSidebar,
    onContextMenu,
    onCreateQATask,
    onCreateTaskInCell,
    onOverdueCloseAndCreate,
    onSegmentEditSave,
    onTaskResize,
    quickAdd,
    selectedSprintId,
    taskChangelogsByTaskId,
    taskIssueCommentsByTaskId,
  } = section.board;
  return useMemo(
    () => ({
      boardId,
      commentActions,
      developers,
      disableCloseSidebarOnClick: true,
      errorReasons,
      errorTaskIds,
      globalNameFilter,
      holidayDayIndices,
      participantsColumnWidth,
      quickAdd,
      selectedSprintId,
      showLinks,
      sprintStartDate,
      sprintTimelineWorkingDays,
      swimlaneFactChangelogsByTaskId: taskChangelogsByTaskId,
      swimlaneFactCommentsByTaskId: taskIssueCommentsByTaskId,
      swimlaneFactDeveloperMap,
      taskLinks: filteredTaskLinks,
      viewMode,
      onCloseSidebar,
      onContextMenu,
      onCreateQATask,
      onCreateTaskInCell,
      onFactSegmentHover,
      onOverdueCloseAndCreate,
      onSegmentEditCancel,
      onSegmentEditSave,
      onTaskClick,
      onTaskHover,
      onTaskResize,
    }),
    [
      boardId,
      commentActions,
      developers,
      errorReasons,
      errorTaskIds,
      filteredTaskLinks,
      globalNameFilter,
      holidayDayIndices,
      participantsColumnWidth,
      quickAdd,
      selectedSprintId,
      showLinks,
      sprintStartDate,
      sprintTimelineWorkingDays,
      swimlaneFactDeveloperMap,
      taskChangelogsByTaskId,
      taskIssueCommentsByTaskId,
      viewMode,
      onCloseSidebar,
      onContextMenu,
      onCreateQATask,
      onCreateTaskInCell,
      onFactSegmentHover,
      onOverdueCloseAndCreate,
      onSegmentEditCancel,
      onSegmentEditSave,
      onTaskClick,
      onTaskHover,
      onTaskResize,
    ]
  );
}
