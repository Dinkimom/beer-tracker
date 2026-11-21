import type { SwimlaneInProgressFactSegment } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import type { QuickAddController } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { TaskResizeParams } from '@/features/task/hooks/useTaskResize';
import type { Comment, Developer, PhaseSegment, Task, TaskPosition } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';
import type { ComponentProps } from 'react';

import {
  buildSwimlaneCommentProjection,
  buildCommentCardRowById,
  filterPlannerCommentsByLayers,
  isPlannerAnnotationVisibleOnLayers,
  mergeSwimlaneCommentPositions,
  mergeSwimlaneCommentTasksMap,
} from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { Swimlane } from '@/features/swimlane/components/Swimlane';
import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';

type SwimlaneProps = ComponentProps<typeof Swimlane>;

export function buildSwimlanePropsForDeveloper(input: {
  /** Быстрое добавление — одним объектом (`QuickAddController`). */
  quickAdd?: QuickAddController;
  activeDraggableId: string | null;
  activeTask: Task | null;
  activeTaskDuration: number | null;
  boardId: number | null;
  cardShadowTaskId: string | null;
  comments: Comment[];
  commentsVisible: boolean;
  swimlaneImagesVisible?: boolean;
  swimlaneNotesVisible?: boolean;
  contextMenuBlurOtherCards: boolean;
  contextMenuTaskId: string | null;
  developer: Developer;
  developerAvailability: SwimlaneProps['developerAvailability'];
  developers: Developer[];
  dragAndDropIsDraggingTask: boolean;
  effectiveFactHoveredTaskId: string | null;
  errorReasons: SwimlaneProps['errorReasons'];
  errorTaskIds: Set<string>;
  globalNameFilter: string;
  holidayDayIndices: Set<number>;
  hoverConnectedTaskIds: Set<string> | null;
  hoveredTaskId: string | null;
  onCloseSidebar: () => void;
  onCommentApprove?: (commentId: string) => void;
  onCommentCardRowLayoutUpdate?: SwimlaneProps['onCommentCardRowLayoutUpdate'];
  onCommentCreate?: (comment: Comment) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentUpdate?: (commentId: string, text: string) => void;
  onContextMenu: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean) => void;
  onCreateQATask: (devTaskId: string, anchorRect?: DOMRect) => void;
  onOverdueCloseAndCreate?: SwimlaneProps['onOverdueCloseAndCreate'];
  onCreateTaskInCell?: SwimlaneProps['onCreateTaskInCell'];
  onFactSegmentHover: (taskId: string | null) => void;
  onSegmentEditCancel: () => void;
  onSegmentEditSave?: (position: TaskPosition, segments: PhaseSegment[], isQa: boolean) => void;
  onTaskClick: (taskId: string) => void;
  onTaskHover: (taskId: string | null) => void;
  onTaskResize: (taskId: string, params: TaskResizeParams) => void;
  participantsColumnWidth: number;
  qaTasksMap: Map<string, Task>;
  linkingFromTaskId?: string | null;
  showLinks?: boolean;
  taskLinks?: Array<{ fromTaskId: string; toTaskId: string; id: string }>;
  segmentEditTaskId: string | null;
  selectedSprintId: number | null;
  sprintStartDate: Date;
  sprintTimelineWorkingDays: number;
  swimlaneFactChangelogsByTaskId?: Map<string, ChangelogEntry[]>;
  swimlaneFactCommentsByTaskId?: Map<string, IssueComment[]>;
  swimlaneFactDeveloperMap: Map<string, Developer>;
  swimlaneFactTimelineEnabled: boolean;
  swimlaneInProgressDurations: SwimlaneInProgressFactSegment[];
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  tasksMap: Map<string, Task>;
  viewMode: 'compact' | 'full';
}): SwimlaneProps {
  const isTeamLane = isTeamSwimlaneAssigneeId(input.developer.id);
  const annotationLayers = {
    imagesVisible: input.swimlaneImagesVisible !== false,
    notesVisible: input.swimlaneNotesVisible !== false,
  };
  const developerComments = input.commentsVisible
    ? filterPlannerCommentsByLayers(
        input.comments.filter((c) => (c.rowAssigneeId ?? c.assigneeId) === input.developer.id),
        annotationLayers
      )
    : [];
  const commentProjection = buildSwimlaneCommentProjection(developerComments);
  const visibleAssigneeTasks = input.tasks.filter((task) =>
    isPlannerAnnotationVisibleOnLayers(task, annotationLayers)
  );

  return {
    quickAdd: input.quickAdd,
    activeDraggableId: input.activeDraggableId,
    activeTask: input.activeTask,
    activeTaskDuration: input.activeTaskDuration,
    boardId: input.boardId,
    cardShadowTaskId: input.cardShadowTaskId,
    commentCardRowById: buildCommentCardRowById(developerComments),
    contextMenuBlurOtherCards: input.contextMenuBlurOtherCards,
    contextMenuTaskId: input.contextMenuTaskId,
    developer: input.developer,
    developerAvailability: isTeamLane ? undefined : input.developerAvailability,
    developers: input.developers,
    disableCloseSidebarOnClick: true,
    errorReasons: input.errorReasons,
    errorTaskIds: input.errorTaskIds,
    factHoveredTaskId: input.effectiveFactHoveredTaskId,
    globalNameFilter: input.globalNameFilter,
    holidayDayIndices: input.holidayDayIndices,
    hoverConnectedTaskIds: input.hoverConnectedTaskIds,
    hoveredTaskId: input.hoveredTaskId,
    isDraggingTask: input.dragAndDropIsDraggingTask,
    linkingFromTaskId: input.linkingFromTaskId ?? null,
    showLinks: input.showLinks,
    participantsColumnWidth: input.participantsColumnWidth,
    qaTasksMap: input.qaTasksMap,
    segmentEditTaskId: input.segmentEditTaskId,
    selectedSprintId: input.selectedSprintId,
    selectedTaskId: null,
    sprintStartDate: input.sprintStartDate,
    sprintTimelineWorkingDays: input.sprintTimelineWorkingDays,
    swimlaneFactChangelogsByTaskId: input.swimlaneFactChangelogsByTaskId,
    swimlaneFactCommentsByTaskId: input.swimlaneFactCommentsByTaskId,
    swimlaneFactDeveloperMap: input.swimlaneFactDeveloperMap,
    swimlaneFactTimelineEnabled: isTeamLane ? false : input.swimlaneFactTimelineEnabled,
    swimlaneInProgressDurations: isTeamLane ? [] : input.swimlaneInProgressDurations,
    taskLinks: input.taskLinks,
    taskPositions: mergeSwimlaneCommentPositions(input.taskPositions, commentProjection.positions),
    tasks: [...visibleAssigneeTasks, ...commentProjection.tasks],
    tasksMap: mergeSwimlaneCommentTasksMap(input.tasksMap, commentProjection.tasksMap),
    viewMode: input.viewMode,
    onCloseSidebar: input.onCloseSidebar,
    onCommentCreate: input.onCommentCreate,
    onCommentCardRowLayoutUpdate: input.onCommentCardRowLayoutUpdate,
    onCommentApprove: input.onCommentApprove,
    onCommentDelete: input.onCommentDelete,
    onCommentUpdate: input.onCommentUpdate,
    onContextMenu: input.onContextMenu,
    onCreateQATask: input.onCreateQATask,
    onCreateTaskInCell: input.onCreateTaskInCell,
    onOverdueCloseAndCreate: input.onOverdueCloseAndCreate,
    onFactSegmentHover: input.onFactSegmentHover,
    onSegmentEditCancel: input.onSegmentEditCancel,
    onSegmentEditSave: input.onSegmentEditSave,
    onTaskClick: input.onTaskClick,
    onTaskHover: input.onTaskHover,
    onTaskResize: input.onTaskResize,
  };
}

export function mergeSwimlanePositionsWithVisibleComments(input: {
  comments: Comment[];
  commentsVisible: boolean;
  swimlaneImagesVisible: boolean;
  swimlaneNotesVisible: boolean;
  taskPositions: Map<string, TaskPosition>;
}): Map<string, TaskPosition> {
  const annotationLayers = {
    imagesVisible: input.swimlaneImagesVisible,
    notesVisible: input.swimlaneNotesVisible,
  };
  const visibleComments = input.commentsVisible
    ? filterPlannerCommentsByLayers(input.comments, annotationLayers)
    : [];
  const commentProjection = buildSwimlaneCommentProjection(visibleComments);
  return mergeSwimlaneCommentPositions(input.taskPositions, commentProjection.positions);
}

export function resolveSwimlaneActiveTask(
  activeTaskId: string | null,
  allTasksForDrag: Task[]
): Task | null {
  if (!activeTaskId) return null;
  return allTasksForDrag.find((t) => t.id === activeTaskId) ?? null;
}
