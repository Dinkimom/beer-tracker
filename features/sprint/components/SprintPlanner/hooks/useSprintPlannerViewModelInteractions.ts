import type { ConfirmDialogPromptOptions } from '@/components/ConfirmDialog';
import type { TaskResizeParams } from '@/features/task/hooks/useTaskResize';
import type { BoardViewMode } from '@/hooks/useLocalStorage';
import type { BoardListItem } from '@/lib/api/types';
import type { Comment, Developer, Task, TaskPosition } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { PARTS_PER_DAY } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { useBoards } from '@/features/board/hooks/useBoards';
import {
  buildSwimlaneCommentProjection,
  filterPlannerCommentsByLayers,
  isPlannerAnnotationVisibleOnLayers,
  mergeSwimlaneCommentPositions,
  mergeSwimlaneCommentTasksMap,
  parseSwimlaneCommentTaskId,
  swimlanePositionToCommentResizePatch,
} from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { useQATaskManagement } from '@/features/qa/hooks/useQATaskManagement';
import { useDragAndDrop } from '@/features/swimlane/hooks/useDragAndDrop';
import { filterTaskLinksByKnownTaskIds } from '@/features/swimlane/utils/swimlaneLinkingHelpers';
import { applyTaskResizeToPositions } from '@/features/task/hooks/useTaskResizeHelpers';
import { useRootStore } from '@/lib/layers';
import {
  commentIdSetFromRecords,
  resolvePlannerLinkEndpoints,
} from '@/lib/planner/plannerLinkEndpoint';

import { useDevelopersManagement } from '../../../hooks/useDevelopersManagement';
import { useKeyboardAndMouseHandlers } from '../../../hooks/useKeyboardAndMouseHandlers';
import { useTaskOperations } from '../../../hooks/useTaskOperations';

import { deleteSwimlaneCommentAfterDiagramConfirm } from './confirmSwimlaneDiagramDelete';
import { useFeatureLanePlannerDrag } from './useFeatureLanePlannerDrag';
import { useSprintPlannerActiveDragTask } from './useSprintPlannerActiveDragTask';
import { useSprintPlannerAssigneePicker } from './useSprintPlannerAssigneePicker';
import { useSprintPlannerEstimateHandlers } from './useSprintPlannerEstimateHandlers';
import { useSprintPlannerHandlers } from './useSprintPlannerHandlers';
import { useSprintPlannerQuickAddDraft } from './useSprintPlannerQuickAddDraft';
import { useSprintPlannerWorkflowScreens } from './useSprintPlannerWorkflowScreens';

type DevelopersManagement = ReturnType<typeof useDevelopersManagement>;
type WorkflowScreens = ReturnType<typeof useSprintPlannerWorkflowScreens>;
type SprintPlannerUi = ReturnType<typeof useRootStore>['sprintPlannerUi'];
type GetQueueByBoardId = ReturnType<typeof useBoards>['getQueueByBoardId'];

interface UseSprintPlannerViewModelInteractionsParams {
  allTasksForDrag: Task[];
  backlogTaskRef: React.MutableRefObject<{
    getTask: (taskId: string) => Task | undefined;
    removeTask: (taskId: string) => void;
  } | null>;
  boardIdForPlannerData: number | null;
  boards: BoardListItem[];
  comments: Comment[];
  commentsVisible: boolean;
  developers: Developer[];
  developersManagement: DevelopersManagement;
  filteredTaskLinks: Array<{ fromTaskId: string; toTaskId: string; id: string }>;
  filteredTaskPositions: Map<string, TaskPosition>;
  forDemoPlanner: boolean;
  getQueueByBoardId: GetQueueByBoardId;
  qaTasksByOriginalId: Map<string, Task>;
  qaTasksMap: Map<string, Task>;
  selectedSprintId: number | null;
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  setTaskLinks: React.Dispatch<
    React.SetStateAction<Array<{ fromTaskId: string; toTaskId: string; id: string }>>
  >;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  slaBugsTasks: Task[] | undefined;
  sprintPlannerUi: SprintPlannerUi;
  sprints: SprintListItem[];
  sprintStartDate: Date;
  sprintTimelineWorkingDays: number;
  swimlaneImagesVisible: boolean;
  swimlaneNotesVisible: boolean;
  syncAssignees: boolean;
  syncEstimates: boolean;
  taskLinks: Array<{ fromTaskId: string; toTaskId: string; id: string }>;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  tasksMap: Map<string, Task>;
  viewMode: BoardViewMode;
  workflowScreens: WorkflowScreens;
  confirm: (message: string, options?: ConfirmDialogPromptOptions) => Promise<boolean>;
  debouncedUpdateXarrow: () => void;
  deleteComment: (commentId: string) => Promise<void>;
  deleteLink: (linkId: string) => Promise<void>;
  deletePosition: (taskId: string) => Promise<void>;
  onTasksReload?: (options?: { showToast?: boolean }) => void;
  saveLink: (link: { fromTaskId: string; toTaskId: string; id: string }) => Promise<void>;
  savePosition: (
    position: TaskPosition,
    isQa?: boolean,
    devTaskKey?: string,
    immediate?: boolean,
    options?: { recordHistory?: boolean }
  ) => Promise<void>;
  setTaskPositions: (
    positions:
      | Map<string, TaskPosition>
      | ((prev: Map<string, TaskPosition>) => Map<string, TaskPosition>),
    options?: { recordHistory?: boolean }
  ) => void;
}

export function useSprintPlannerViewModelInteractions({
  allTasksForDrag,
  backlogTaskRef,
  boardIdForPlannerData,
  boards,
  comments,
  commentsVisible,
  confirm,
  debouncedUpdateXarrow,
  deleteComment,
  deleteLink,
  deletePosition,
  developers,
  developersManagement,
  filteredTaskLinks,
  filteredTaskPositions,
  forDemoPlanner,
  getQueueByBoardId,
  onTasksReload,
  qaTasksByOriginalId,
  qaTasksMap,
  saveLink,
  savePosition,
  selectedSprintId,
  setComments,
  setTaskLinks,
  setTaskPositions,
  setTasks,
  slaBugsTasks,
  sprintPlannerUi,
  sprintStartDate,
  sprintTimelineWorkingDays,
  sprints,
  swimlaneImagesVisible,
  swimlaneNotesVisible,
  syncAssignees,
  syncEstimates,
  taskLinks,
  taskPositions,
  tasks,
  tasksMap,
  viewMode,
  workflowScreens,
}: UseSprintPlannerViewModelInteractionsParams) {
  const { t } = useI18n();
  const annotationLayers = useMemo(
    () => ({
      imagesVisible: swimlaneImagesVisible,
      notesVisible: swimlaneNotesVisible,
    }),
    [swimlaneImagesVisible, swimlaneNotesVisible]
  );
  const commentProjection = useMemo(() => {
    const visibleComments = commentsVisible
      ? filterPlannerCommentsByLayers(comments, annotationLayers)
      : [];
    return buildSwimlaneCommentProjection(visibleComments);
  }, [annotationLayers, comments, commentsVisible]);
  const allTasksForDragWithComments = useMemo(
    () => [
      ...allTasksForDrag.filter((task) => isPlannerAnnotationVisibleOnLayers(task, annotationLayers)),
      ...commentProjection.tasks,
    ],
    [allTasksForDrag, annotationLayers, commentProjection.tasks]
  );
  const filteredTaskPositionsWithComments = useMemo(
    () => mergeSwimlaneCommentPositions(filteredTaskPositions, commentProjection.positions),
    [commentProjection.positions, filteredTaskPositions]
  );
  const tasksMapWithComments = useMemo(
    () => mergeSwimlaneCommentTasksMap(tasksMap, commentProjection.tasksMap),
    [commentProjection.tasksMap, tasksMap]
  );
  const swimlaneTaskLinks = useMemo(() => {
    const commentIds = commentIdSetFromRecords(comments);
    const normalized = taskLinks.map((link) => resolvePlannerLinkEndpoints(link, commentIds));
    return filterTaskLinksByKnownTaskIds(normalized, tasksMapWithComments);
  }, [comments, taskLinks, tasksMapWithComments]);
  const taskOperations = useTaskOperations({
    tasks,
    taskPositions,
    taskLinks,
    selectedSprintId,
    sprints,
    setTasks,
    setTaskPositions,
    setTaskLinks,
    deletePosition,
    deleteLink,
    onTasksReload,
    updateXarrow: debouncedUpdateXarrow,
  });

  const qaTaskManagement = useQATaskManagement({
    taskPositions,
    filteredTaskPositions,
    filteredTaskLinks,
    allTasksForDrag,
    sortedDevelopers: developersManagement.sortedDevelopers,
    selectedSprintId,
    savePosition,
    setTaskPositions,
    setTaskLinks,
    saveLink,
    updateXarrow: debouncedUpdateXarrow,
  });

  const {
    handleOccupancyPositionSave,
    handleSegmentEditSave,
    handleSplitPhaseIntoSegments,
    handleUpdateEstimate,
  } = useSprintPlannerEstimateHandlers({
    savePosition,
    setTasks,
    syncEstimates,
    tasksMap,
  });

  const {
    assigneePicker,
    setAssigneePicker,
    handleAssigneeSelect,
    handleContextMenuAssigneeSelect,
    handleOpenAssigneePicker,
    onRequestQaEngineerPicker,
  } = useSprintPlannerAssigneePicker({
    developers,
    filteredTaskPositions,
    qaTaskManagement,
    savePosition,
    setComments,
    setTasks,
    syncAssignees,
    taskPositions,
    tasks,
  });

  const resetDragStateRef = useRef<(() => void) | null>(null);

  const handlers = useSprintPlannerHandlers({
    selectedSprintId,
    setComments,
    setSidebarOpen: sprintPlannerUi.setSidebarOpen,
    setTaskLinks,
    setTaskPositions,
    setTasks,
    backlogTaskRef,
    slaBugsTasks,
    allTasksForDrag: allTasksForDragWithComments,
    confirm,
    debouncedUpdateXarrow,
    developersManagement,
    resetDragStateRef,
    filteredTaskLinks,
    filteredTaskPositions: filteredTaskPositionsWithComments,
    qaTaskManagement,
    qaTasksMap,
    qaTasksByOriginalId,
    sprintStartDate,
    sprintTimelineWorkingDays,
    taskOperations,
    tasks,
    tasksMap: tasksMapWithComments,
    taskPositions,
    deleteLink,
    deletePosition,
    deleteComment,
    onRequestQaEngineerPicker,
    saveLink,
    savePosition,
    onTasksReload,
    taskLinks,
    workflowScreens,
  });

  const handleCommentCreateWithFocus = useCallback(
    (comment: Parameters<NonNullable<typeof handlers>['handleCommentCreate']>[0]) => {
      handlers.handleCommentCreate(comment);
    },
    [handlers]
  );

  const handleCommentDelete = useCallback(
    (commentId: string) =>
      deleteSwimlaneCommentAfterDiagramConfirm({
        closeDiagramEditor: sprintPlannerUi.closeDiagramEditor,
        commentId,
        comments,
        confirm,
        deleteNow: handlers.handleCommentDelete,
        diagramEditorTaskId: sprintPlannerUi.diagramEditorTaskId,
        t,
      }),
    [comments, confirm, handlers.handleCommentDelete, sprintPlannerUi, t]
  );

  const featureLaneDrag = useFeatureLanePlannerDrag({
    allTasksForDrag,
    backlogTaskRef,
    comments,
    handlers,
    selectedSprintId,
    slaBugsTasks,
    taskPositions,
    tasksMap,
    viewMode,
  });

  const handlePositionUpdateWithComments = featureLaneDrag.handlePositionUpdate;

  const timelineTotalCells = sprintTimelineWorkingDays * PARTS_PER_DAY;
  const handleTaskResizeWithComments = useCallback(
    (taskId: string, params: TaskResizeParams) => {
      const commentId = parseSwimlaneCommentTaskId(taskId);
      if (commentId) {
        const current = commentProjection.positions.get(taskId);
        if (!current) {
          return;
        }
        const result = applyTaskResizeToPositions(
          new Map([[taskId, current]]),
          taskId,
          params,
          timelineTotalCells
        );
        if (result.outgoingPosition) {
          const comment = comments.find((item) => item.id === commentId);
          if (!comment) {
            return;
          }
          handlers.handleCommentMove(
            commentId,
            swimlanePositionToCommentResizePatch(result.outgoingPosition, comment)
          );
          if (comment.kind === 'diagram') {
            sprintPlannerUi.clearStickyNoteCardRowOverride(taskId);
            sprintPlannerUi.clearStickyNoteCardRowPreview();
          }
        }
        return;
      }
      handlers.handleTaskResize(taskId, params);
    },
    [commentProjection.positions, comments, handlers, sprintPlannerUi, timelineTotalCells]
  );

  const dragContextRef = useRef<{
    isDragFromSidebar: boolean;
    sidebarOpen: boolean;
    sidebarWidth: number;
    viewportWidth: number;
  } | null>(null);

  const dragAndDrop = useDragAndDrop({
    tasks: allTasksForDragWithComments,
    taskPositions: filteredTaskPositionsWithComments,
    onPositionUpdate: handlePositionUpdateWithComments,
    onPositionDelete: handlers.handlePositionDelete,
    updateXarrow: debouncedUpdateXarrow,
    onBacklogTaskDrop: featureLaneDrag.handleBacklogTaskDrop,
    dragContextRef,
    swimlaneTimelineWorkingDays: sprintTimelineWorkingDays,
  });

  useLayoutEffect(() => {
    resetDragStateRef.current = dragAndDrop.resetDragState;
    return () => {
      resetDragStateRef.current = null;
    };
  }, [dragAndDrop.resetDragState]);

  useKeyboardAndMouseHandlers({
    filteredTaskPositions,
    selectedSprintId,
    setTaskPositions,
    setTaskLinks,
    deletePosition,
    deleteLink,
    filteredTaskLinks,
  });

  const [isDragFromSidebar, setIsDragFromSidebar] = useState(false);
  const activeTask = useSprintPlannerActiveDragTask({
    activeTaskId: dragAndDrop.activeTaskId,
    allTasksForDrag: allTasksForDragWithComments,
    backlogTaskRef,
    slaBugsTasks,
  });

  const {
    handleCancelQuickAddDraft,
    handleCreateTaskInSwimlaneCell,
    handleQuickAddDraftAssigneeChange,
    handleQuickAddDraftCommentColorChange,
    handleQuickAddDraftImageUrlChange,
    handleQuickAddDraftKindChange,
    handleQuickAddDraftParentChange,
    handleQuickAddDraftQueueChange,
    handleQuickAddDraftTitleChange,
    handleQuickAddDraftTypeChange,
    handlePasteQuickAddNote,
    handleSelectExistingQuickAddDraft,
    handleSubmitQuickAddCommentDraft,
    handleSubmitQuickAddDiagramDraft,
    handleSubmitQuickAddDraft,
    handleSubmitQuickAddImageDraft,
    featureDraftRowNamesById,
    quickAddExcludedIssueKeys,
    quickAddParentSelectOptions,
    quickAddQueueOptions,
    quickAddSubmittingTaskId,
  } = useSprintPlannerQuickAddDraft({
    boardIdForPlannerData,
    boards,
    closeNoteComposer: sprintPlannerUi.closeNoteComposer,
    comments,
    developers,
    forDemoPlanner,
    getQueueByBoardId,
    onCommentCreate: handleCommentCreateWithFocus,
    onCommentDelete: handlers.handleCommentDelete,
    onCommentUpdate: handlers.handleCommentUpdate,
    onDiagramEditorClose: sprintPlannerUi.closeDiagramEditor,
    onDiagramEditorOpen: sprintPlannerUi.openDiagramEditor,
    onOpenCreatedTask: sprintPlannerUi.openTaskInfoPanel,
    savePosition,
    selectedSprintId,
    setTaskPositions,
    setTasks,
    sprintTimelineWorkingDays,
    swimlaneImagesVisible,
    taskPositions,
    tasks,
    tasksMap,
  });

  const handlersWithSwimlaneComments = useMemo(
    () => ({
      ...handlers,
      handleCommentDelete,
      handlePositionUpdate: handlePositionUpdateWithComments,
      handleTaskResize: handleTaskResizeWithComments,
    }),
    [
      handleCommentDelete,
      handlePositionUpdateWithComments,
      handleTaskResizeWithComments,
      handlers,
    ]
  );

  return {
    activeTask,
    allTasksForDragWithComments,
    assigneePicker,
    dragAndDrop,
    dragContextRef,
    filteredTaskPositionsWithComments,
    handleAssigneeSelect,
    handleCancelQuickAddDraft,
    handleContextMenuAssigneeSelect,
    handleCommentCreateWithFocus,
    handleCreateTaskInSwimlaneCell,
    handleOccupancyPositionSave,
    handleOpenAssigneePicker,
    handlePasteQuickAddNote,
    handleQuickAddDraftAssigneeChange,
    handleQuickAddDraftCommentColorChange,
    handleQuickAddDraftImageUrlChange,
    handleQuickAddDraftKindChange,
    handleQuickAddDraftParentChange,
    handleQuickAddDraftQueueChange,
    handleQuickAddDraftTitleChange,
    handleQuickAddDraftTypeChange,
    handleSegmentEditSave,
    handleSelectExistingQuickAddDraft,
    handleSplitPhaseIntoSegments,
    handleSubmitQuickAddCommentDraft,
    handleSubmitQuickAddDiagramDraft,
    handleSubmitQuickAddDraft,
    handleSubmitQuickAddImageDraft,
    handleUpdateEstimate,
    handlers: handlersWithSwimlaneComments,
    isDragFromSidebar,
    featureDraftRowNamesById,
    quickAddExcludedIssueKeys,
    quickAddParentSelectOptions,
    quickAddQueueOptions,
    quickAddSubmittingTaskId,
    setAssigneePicker,
    setIsDragFromSidebar,
    swimlaneTaskLinks,
    tasksMapWithComments,
  };
}
