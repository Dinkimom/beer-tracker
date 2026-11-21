import type { useSprintPlannerLocalPreferences } from './useSprintPlannerLocalPreferences';
import type { useSprintPlannerState } from './useSprintPlannerState';
import type { useSprintPlannerTimeline } from './useSprintPlannerTimeline';
import type { ConfirmDialogPromptOptions } from '@/components/ConfirmDialog';
import type { TaskResizeParams } from '@/features/task/hooks/useTaskResize';
import type { BoardListItem } from '@/lib/api/types';
import type { SprintListItem } from '@/types/tracker';

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { getPartsPerDay } from '@/constants';
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
import { mergePlannerAndTrackerTaskLinks } from '@/lib/planner/trackerLinkOverlay';

import { useDevelopersManagement } from '../../../hooks/useDevelopersManagement';
import { useTaskOperations } from '../../../hooks/useTaskOperations';

import { useFeatureLanePlannerDrag } from './useFeatureLanePlannerDrag';
import { useSprintPlannerActiveDragTask } from './useSprintPlannerActiveDragTask';
import { useSprintPlannerAssigneePicker } from './useSprintPlannerAssigneePicker';
import { useSprintPlannerEstimateHandlers } from './useSprintPlannerEstimateHandlers';
import { useSprintPlannerHandlers } from './useSprintPlannerHandlers';
import { useSprintPlannerQuickAddDraft } from './useSprintPlannerQuickAddDraft';
import { useSprintPlannerWorkflowScreens } from './useSprintPlannerWorkflowScreens';
import { useSwimlaneCommentActions } from './useSwimlaneCommentActions';

type DevelopersManagement = ReturnType<typeof useDevelopersManagement>;
type WorkflowScreens = ReturnType<typeof useSprintPlannerWorkflowScreens>;
type SprintPlannerUi = ReturnType<typeof useRootStore>['sprintPlannerUi'];
type GetQueueByBoardId = ReturnType<typeof useBoards>['getQueueByBoardId'];
interface UseSprintPlannerViewModelInteractionsParams {
  boardIdForPlannerData: number | null;
  boards: BoardListItem[];
  developersManagement: DevelopersManagement;
  forDemoPlanner: boolean;
  getQueueByBoardId: GetQueueByBoardId;
  /** Отображение заметок и фото, синхронизация исполнителей и оценок. */
  preferences: Pick<
    ReturnType<typeof useSprintPlannerLocalPreferences>,
    'swimlaneImagesVisible' | 'swimlaneNotesVisible' | 'syncAssignees' | 'syncEstimates'
  >;
  selectedSprintId: number | null;
  sprintPlannerUi: SprintPlannerUi;
  sprints: SprintListItem[];
  /** Данные доски из `useSprintPlannerState` целиком — разбираются здесь. */
  state: ReturnType<typeof useSprintPlannerState>;
  timeline: Pick<ReturnType<typeof useSprintPlannerTimeline>, 'sprintStartDate' | 'sprintTimelineWorkingDays'>;
  /** Live overlay from Tracker/Jira (not in Postgres). */
  trackerTaskLinks?: Array<{ fromTaskId: string; toTaskId: string; id: string }>;
  workflowScreens: WorkflowScreens;
  confirm: (message: string, options?: ConfirmDialogPromptOptions) => Promise<boolean>;
  debouncedUpdateXarrow: () => void;
  deleteTrackerOverlayLink?: (link: {
    fromTaskId: string;
    id: string;
    toTaskId: string;
  }) => Promise<void>;
  onTasksReload?: (options?: { showToast?: boolean }) => void;
}

export function useSprintPlannerViewModelInteractions({
  preferences,
  state,
  timeline,
  boardIdForPlannerData,
  boards,
  confirm,
  debouncedUpdateXarrow,
  deleteTrackerOverlayLink,
  developersManagement,
  forDemoPlanner,
  getQueueByBoardId,
  onTasksReload,
  selectedSprintId,
  sprintPlannerUi,
  sprints,
  trackerTaskLinks = [],
  workflowScreens,
}: UseSprintPlannerViewModelInteractionsParams) {
  const {
    allTasksForDrag,
    board,
    comments,
    developers,
    filteredTaskLinks,
    filteredTaskPositions,
    setTasks,
    taskLinks,
    taskPositions,
    tasksMap,
    viewMode,
  } = state;
  const { swimlaneImagesVisible, swimlaneNotesVisible, syncAssignees, syncEstimates } = preferences;
  const commentsVisible = swimlaneNotesVisible || swimlaneImagesVisible;
  const { sprintTimelineWorkingDays } = timeline;
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
    const plannerOnly = filterTaskLinksByKnownTaskIds(normalized, tasksMapWithComments);
    return mergePlannerAndTrackerTaskLinks(plannerOnly, trackerTaskLinks);
  }, [comments, taskLinks, tasksMapWithComments, trackerTaskLinks]);
  const taskOperations = useTaskOperations({
    board,
    onTasksReload,
    selectedSprintId,
    setTasks,
    sprints,
    updateXarrow: debouncedUpdateXarrow,
  });

  const qaTaskManagement = useQATaskManagement({
    board,
    filteredTaskPositions,
    sortedDevelopers: developersManagement.sortedDevelopers,
    selectedSprintId,
    sprintTimelineWorkingDays,
    updateXarrow: debouncedUpdateXarrow,
  });

  const {
    handleOccupancyPositionSave,
    handleSegmentEditSave,
    handleSplitPhaseIntoSegments,
    handleUpdateEstimate,
  } = useSprintPlannerEstimateHandlers({
    setTasks,
    syncEstimates,
    tasksMap,
  });

  const {
    assigneePicker,
    setAssigneePicker,
    handleAssigneeSelect,
    handleContextMenuAssigneeSelect,
    onRequestQaEngineerPicker,
  } = useSprintPlannerAssigneePicker({
    board,
    developers,
    filteredTaskPositions,
    qaTaskManagement,
    setTasks,
    syncAssignees,
  });

  const resetDragStateRef = useRef<(() => void) | null>(null);

  const linksVisibleForHandlers = useMemo(
    () => mergePlannerAndTrackerTaskLinks(filteredTaskLinks, trackerTaskLinks),
    [filteredTaskLinks, trackerTaskLinks]
  );
  const taskLinksForHandlers = useMemo(
    () => mergePlannerAndTrackerTaskLinks(taskLinks, trackerTaskLinks),
    [taskLinks, trackerTaskLinks]
  );
  const handlers = useSprintPlannerHandlers({
    boardView: {
      allTasksForDrag: allTasksForDragWithComments,
      filteredTaskLinks: linksVisibleForHandlers,
      filteredTaskPositions: filteredTaskPositionsWithComments,
      taskLinks: taskLinksForHandlers,
      tasksMap: tasksMapWithComments,
    },
    confirm,
    debouncedUpdateXarrow,
    deleteTrackerOverlayLink,
    developersManagement,
    onRequestQaEngineerPicker,
    onTasksReload,
    qaTaskManagement,
    resetDragStateRef,
    selectedSprintId,
    setSidebarOpen: sprintPlannerUi.setSidebarOpen,
    state,
    taskOperations,
    timeline,
    workflowScreens,
  });


  const { commentActions, handleCommentDelete } = useSwimlaneCommentActions({ comments, confirm, handlers });

  const featureLaneDrag = useFeatureLanePlannerDrag({
    allTasksForDrag,
    comments,
    handlers,
    selectedSprintId,
    taskPositions,
    tasksMap,
    viewMode,
  });


  const timelineTotalCells = sprintTimelineWorkingDays * getPartsPerDay();
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
    onPositionUpdate: featureLaneDrag.handlePositionUpdate,
    onPositionDelete: handlers.handlePositionDelete,
    planPatchSprintId: selectedSprintId,
    updateXarrow: debouncedUpdateXarrow,
    dragContextRef,
    swimlaneTimelineWorkingDays: sprintTimelineWorkingDays,
  });

  useLayoutEffect(() => {
    resetDragStateRef.current = dragAndDrop.resetDragState;
    return () => {
      resetDragStateRef.current = null;
    };
  }, [dragAndDrop.resetDragState]);

  const [isDragFromSidebar, setIsDragFromSidebar] = useState(false);
  const activeTask = useSprintPlannerActiveDragTask({
    activeTaskId: dragAndDrop.activeTaskId,
    allTasksForDrag: allTasksForDragWithComments,
  });

  const {
    handleCreateTaskInSwimlaneCell,
    featureDraftRowNamesById,
    quickAdd,
  } = useSprintPlannerQuickAddDraft({
    board,
    boardIdForPlannerData,
    boards,
    closeNoteComposer: sprintPlannerUi.closeNoteComposer,
    forDemoPlanner,
    getQueueByBoardId,
    onCommentCreate: handlers.handleCommentCreate,
    onCommentDelete: handlers.handleCommentDelete,
    onCommentUpdate: handlers.handleCommentUpdate,
    onDiagramEditorClose: sprintPlannerUi.closeDiagramEditor,
    onDiagramEditorOpen: sprintPlannerUi.openDiagramEditor,
    onOpenCreatedTask: sprintPlannerUi.openTaskInfoPanel,
    selectedSprintId,
    setTasks,
    sprintTimelineWorkingDays,
    swimlaneImagesVisible,
    tasksMap,
  });

  const handlersWithSwimlaneComments = useMemo(
    () => ({
      ...handlers,
      handleCommentDelete,
      handlePositionUpdate: featureLaneDrag.handlePositionUpdate,
      handleTaskResize: handleTaskResizeWithComments,
    }),
    [
      handleCommentDelete,
      featureLaneDrag.handlePositionUpdate,
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
    handleAssigneeSelect,
    handleContextMenuAssigneeSelect,
    commentActions,
    handleCreateTaskInSwimlaneCell,
    handleOccupancyPositionSave,
    handleSegmentEditSave,
    handleSplitPhaseIntoSegments,
    handleUpdateEstimate,
    handlers: handlersWithSwimlaneComments,
    isDragFromSidebar,
    featureDraftRowNamesById,
    quickAdd,
    setAssigneePicker,
    setIsDragFromSidebar,
    swimlaneTaskLinks,
  };
}
