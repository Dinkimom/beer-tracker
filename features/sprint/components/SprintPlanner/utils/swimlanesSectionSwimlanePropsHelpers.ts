import type { CustomSelectOption } from '@/components/CustomSelect';
import type { QuickAddQueueOption } from '@/features/board/quickAddQueueOptions';
import type { SwimlaneInProgressFactSegment } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import type { QuickAddDraftKind } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { TaskResizeParams } from '@/features/task/hooks/useTaskResize';
import type { CalendarBusySegment } from '@/lib/calendar/calendarEventTypes';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
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
  activeDraggableId: string | null;
  activeTask: Task | null;
  activeTaskDuration: number | null;
  boardId: number | null;
  calendarBusySegments: CalendarBusySegment[];
  calendarBusyVisible: boolean;
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
  hoveredCell: SwimlaneProps['hoveredCell'];
  hoveredTaskId: string | null;
  onCancelQuickAddDraft?: (taskId: string) => void;
  onCloseSidebar: () => void;
  onCommentCreate?: (comment: Comment) => void;
  onCommentCardRowLayoutUpdate?: SwimlaneProps['onCommentCardRowLayoutUpdate'];
  onCommentDelete?: (commentId: string) => void;
  onCommentUpdate?: (commentId: string, text: string) => void;
  onContextMenu: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean) => void;
  onCreateQATask: (devTaskId: string, anchorRect?: DOMRect) => void;
  onCreateTaskInCell?: SwimlaneProps['onCreateTaskInCell'];
  onFactSegmentHover: (taskId: string | null) => void;
  onPasteQuickAddNote?: (taskId: string) => void;
  onQuickAddDraftAssigneeChange?: (taskId: string, assigneeId: string) => void;
  onQuickAddDraftCommentColorChange?: (taskId: string, color: StickyNoteColor) => void;
  onQuickAddDraftImageUrlChange?: (taskId: string, url: string | undefined) => void;
  onQuickAddDraftKindChange?: (taskId: string, kind: QuickAddDraftKind | undefined) => void;
  onQuickAddDraftParentChange?: (taskId: string, parentKey: string) => void;
  onQuickAddDraftQueueChange?: (taskId: string, queueKey: string) => void;
  onQuickAddDraftTitleChange?: (taskId: string, title: string) => void;
  onQuickAddDraftTypeChange?: (taskId: string, type: string) => void;
  onSegmentEditCancel: () => void;
  onSegmentEditSave?: (position: TaskPosition, segments: PhaseSegment[], isQa: boolean) => void;
  onSelectExistingQuickAddDraft?: (taskId: string, task: Task) => void;
  onSubmitQuickAddCommentDraft?: (taskId: string, draftTitle?: string) => void;
  onSubmitQuickAddDiagramDraft?: (taskId: string, name?: string) => void;
  onSubmitQuickAddImageDraft?: (taskId: string, caption: string, imageUrl: string) => void;
  onSubmitQuickAddDraft?: (taskId: string, draftTitle?: string) => Promise<void> | void;
  onTaskClick: (taskId: string) => void;
  onTaskHover: (taskId: string | null) => void;
  onTaskResize: (taskId: string, params: TaskResizeParams) => void;
  participantsColumnWidth: number;
  qaTasksMap: Map<string, Task>;
  quickAddBoardId: number | null;
  quickAddExcludedIssueKeys?: ReadonlySet<string>;
  quickAddParentSelectOptions?: CustomSelectOption<string>[];
  quickAddQueueOptions: QuickAddQueueOption[];
  quickAddSubmittingTaskId: string | null;
  linkingFromTaskId?: string | null;
  linkSourceEndCell?: number | null;
  taskLinks?: Array<{ fromTaskId: string; toTaskId: string; id: string }>;
  segmentEditTaskId: string | null;
  selectedSprintId: number | null;
  sidebarOpen: boolean;
  sidebarWidth: number;
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
    activeDraggableId: input.activeDraggableId,
    activeTask: input.activeTask,
    activeTaskDuration: input.activeTaskDuration,
    boardId: input.boardId,
    calendarBusySegments: isTeamLane ? [] : input.calendarBusySegments,
    calendarBusyVisible: isTeamLane ? false : input.calendarBusyVisible,
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
    hoveredCell: input.hoveredCell,
    hoveredTaskId: input.hoveredTaskId,
    isDraggingTask: input.dragAndDropIsDraggingTask,
    linkingFromTaskId: input.linkingFromTaskId ?? null,
    linkSourceEndCell: input.linkSourceEndCell ?? null,
    participantsColumnWidth: input.participantsColumnWidth,
    qaTasksMap: input.qaTasksMap,
    quickAddBoardId: input.quickAddBoardId,
    quickAddExcludedIssueKeys: input.quickAddExcludedIssueKeys,
    quickAddParentSelectOptions: input.quickAddParentSelectOptions,
    quickAddQueueOptions: input.quickAddQueueOptions,
    quickAddSubmittingTaskId: input.quickAddSubmittingTaskId,
    segmentEditTaskId: input.segmentEditTaskId,
    selectedSprintId: input.selectedSprintId,
    selectedTaskId: null,
    sidebarOpen: input.sidebarOpen,
    sidebarWidth: input.sidebarWidth,
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
    onCancelQuickAddDraft: input.onCancelQuickAddDraft,
    onCloseSidebar: input.onCloseSidebar,
    onCommentCreate: input.onCommentCreate,
    onCommentCardRowLayoutUpdate: input.onCommentCardRowLayoutUpdate,
    onCommentDelete: input.onCommentDelete,
    onCommentUpdate: input.onCommentUpdate,
    onContextMenu: input.onContextMenu,
    onCreateQATask: input.onCreateQATask,
    onCreateTaskInCell: input.onCreateTaskInCell,
    onFactSegmentHover: input.onFactSegmentHover,
    onPasteQuickAddNote: input.onPasteQuickAddNote,
    onQuickAddDraftAssigneeChange: input.onQuickAddDraftAssigneeChange,
    onQuickAddDraftCommentColorChange: input.onQuickAddDraftCommentColorChange,
    onQuickAddDraftImageUrlChange: input.onQuickAddDraftImageUrlChange,
    onQuickAddDraftKindChange: input.onQuickAddDraftKindChange,
    onQuickAddDraftParentChange: input.onQuickAddDraftParentChange,
    onQuickAddDraftQueueChange: input.onQuickAddDraftQueueChange,
    onQuickAddDraftTitleChange: input.onQuickAddDraftTitleChange,
    onQuickAddDraftTypeChange: input.onQuickAddDraftTypeChange,
    onSegmentEditCancel: input.onSegmentEditCancel,
    onSegmentEditSave: input.onSegmentEditSave,
    onSelectExistingQuickAddDraft: input.onSelectExistingQuickAddDraft,
    onSubmitQuickAddCommentDraft: input.onSubmitQuickAddCommentDraft,
    onSubmitQuickAddDiagramDraft: input.onSubmitQuickAddDiagramDraft,
    onSubmitQuickAddImageDraft: input.onSubmitQuickAddImageDraft,
    onSubmitQuickAddDraft: input.onSubmitQuickAddDraft,
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

export function resolveSwimlaneHoveredCellForDeveloper(
  hoveredCell: { assigneeId: string; day: number; part: number } | null,
  developerId: string
) {
  return hoveredCell?.assigneeId === developerId ? hoveredCell : null;
}
