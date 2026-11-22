import type { Task } from '@/types';
import type { SprintInfo, SprintListItem } from '@/types/tracker';

import {
  useMemo,
  useRef,
} from 'react';
import { useXarrow } from 'react-xarrows';

import { useConfirmDialog } from '@/components/ConfirmDialog';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { useBoards } from '@/features/board/hooks/useBoards';
import { isSwimlaneCommentTask, selectPendingAgentProposalNotes } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { useSprintPlannerTrackerLinkHandlers } from '@/features/sprint/hooks/useSprintPlannerTrackerLinkHandlers';
import { computeAssigneePointsStats } from '@/features/sprint/utils/assigneePointsStats';
import { useCloseOverdueAndCreateNext } from '@/features/swimlane/hooks/useCloseOverdueAndCreateNext';
import { useLatestCallback } from '@/hooks/useLatestCallback';
import { useDebouncedCallback } from '@/hooks/usePerformance';
import { parseStickyNoteColor } from '@/lib/comments/stickyNoteColor';
import { useRootStore } from '@/lib/layers';

import { useDevelopersManagement } from '../../../hooks/useDevelopersManagement';

import { useSprintMovePlacement } from './useSprintMovePlacement';
import { useSprintPlannerBoardEffects } from './useSprintPlannerBoardEffects';
import { useSprintPlannerIntegrationRules } from './useSprintPlannerIntegrationRules';
import { useSprintPlannerLocalPreferences } from './useSprintPlannerLocalPreferences';
import { useSprintPlannerMembersSync } from './useSprintPlannerMembersSync';
import { useSprintPlannerState } from './useSprintPlannerState';
import { useSprintPlannerSwimlaneData } from './useSprintPlannerSwimlaneData';
import { useSprintPlannerTimeline } from './useSprintPlannerTimeline';
import { useSprintPlannerViewModelInteractions } from './useSprintPlannerViewModelInteractions';
import { useSprintPlannerWorkflowScreens } from './useSprintPlannerWorkflowScreens';

interface UseSprintPlannerViewModelParams {
  demoPlannerRulesOrganizationId?: string;
  goalTaskIds: string[];
  lockedBoardId?: number;
  selectedSprintId: number | null;
  sprintInfo: SprintInfo | null;
  sprints: SprintListItem[];
  sprintsLoading: boolean;
  tasksLoading: boolean;
  tasksReloading: boolean;
  onSprintChange: (sprintId: number | null) => void;
  onTasksReload?: (options?: { showToast?: boolean }) => void;
}

export function useSprintPlannerViewModel({
  demoPlannerRulesOrganizationId,
  goalTaskIds,
  lockedBoardId,
  onSprintChange,
  onTasksReload,
  selectedSprintId,
  sprintInfo,
  sprints,
  sprintsLoading,
  tasksLoading,
  tasksReloading,
}: UseSprintPlannerViewModelParams) {
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  const { sprintPlannerUi } = useRootStore();
  // useXarrow отдаёт новую функцию на каждый рендер; без стабильной обёртки эффект ниже
  // (начальная перерисовка стрелок) перезапускался после каждого рендера и сам вызывал рендер —
  // доска перерисовывалась несколько раз в секунду без действий пользователя.
  const updateXarrow = useLatestCallback(useXarrow());
  const { boards, getQueueByBoardId } = useBoards();

  // leading и trailing — умолчания useDebouncedCallback.
  const debouncedUpdateXarrow = useDebouncedCallback(updateXarrow, 100);

  const preferences = useSprintPlannerLocalPreferences();
  const {
    selectedBoardId,
    assigneeColumnWidth,
    setAssigneeColumnWidth,
    featureColumnWidth,
    setFeatureColumnWidth,
    selectedAssigneeIds,
    setSelectedAssigneeIds,
    swimlaneLinksVisible,
    swimlaneFactTimelineVisible,
    swimlaneNotesVisible,
    swimlaneImagesVisible,
    linksDimOnHover,
    kanbanGroupBy,
  } = preferences;

  const boardIdForPlannerData: number | null =
    lockedBoardId !== undefined ? lockedBoardId : selectedBoardId;

  const plannerIntegrationRules = useSprintPlannerIntegrationRules({
    boardIdForPlannerData,
    demoPlannerRulesOrganizationId,
    selectedSprintId,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { confirmWithAction, DialogComponent, confirm } = useConfirmDialog();

  const workflowScreens = useSprintPlannerWorkflowScreens(boardIdForPlannerData, getQueueByBoardId);

  const state = useSprintPlannerState({
    selectedBoardId: boardIdForPlannerData,
    selectedSprintId,
    sprintEndDate: sprintInfo?.endDate ?? null,
    sprintStartDate: sprintInfo?.startDate ?? null,
  });

  const {
    sidebarWidth,
    setSidebarWidth,
    viewMode,
    setViewMode,
    isMounted,
    positionHistory,
    boardViewers,
    unassignedTasks,
    tasksByAssignee,
  } = state;
  const {
    allTasksForDrag,
    developers,
    displayPositions: taskPositions,
    tasks,
    tasksMap,
    visibleLinks: filteredTaskLinks,
    visiblePositions: filteredTaskPositions,
  } = state.board;
  const comments = state.board.comments.items;

  const participantsColumnWidth =
    viewMode === 'features' ? featureColumnWidth : assigneeColumnWidth;
  const setParticipantsColumnWidth =
    viewMode === 'features' ? setFeatureColumnWidth : setAssigneeColumnWidth;


  const swimlaneFactTimelineEnabled =
    swimlaneFactTimelineVisible && (viewMode === 'full' || viewMode === 'compact');

  const {
    swimlaneTaskChangelogsMap,
    swimlaneTaskDurationsMap,
    swimlaneTaskIssueCommentsMap,
  } = useSprintPlannerSwimlaneData({
    allTasksForDrag,
    swimlaneFactTimelineEnabled,
  });

  const trackerLinks = useSprintPlannerTrackerLinkHandlers({
    allTasksForDrag,
    board: state.board,
    enabled: swimlaneLinksVisible && (viewMode === 'full' || viewMode === 'compact'),
    selectedSprintId,
    tasksMap,
  });

  const assigneePointsStats = useMemo(
    () => computeAssigneePointsStats(filteredTaskPositions, tasksMap),
    [filteredTaskPositions, tasksMap]
  );

  const timeline = useSprintPlannerTimeline(boardIdForPlannerData, sprintInfo);
  const { availability, boardAvailabilityEvents, sprintStartDate, sprintTimelineWorkingDays } = timeline;

  useSprintPlannerBoardEffects({
    debouncedUpdateXarrow,
    deletePosition: state.board.positions.deletePosition,
    isMounted,
    scrollContainerRef,
    selectedSprintId,
    setViewMode,
    sprintInfo,
    sprints,
    taskPositions,
    tasks,
    testingFlowMode: plannerIntegrationRules?.testingFlowMode,
    viewMode,
  });

  const developersManagement = useDevelopersManagement(
    developers,
    filteredTaskPositions,
    tasksByAssignee
  );
  const movePlacement = useSprintMovePlacement({
    board: state.board,
    developers: developersManagement.sortedDevelopers,
    scrollContainerRef,
    selectedSprintId,
    sprints,
    taskPositions,
    tasksLoading,
    tasksMap,
    viewMode,
    onSprintChange,
    setViewMode,
  });
  const { handleRemoveParticipantFromTeam } = useSprintPlannerMembersSync({
    boardIdForPlannerData,
    confirmWithAction,
    developers,
    selectedSprintId,
  });

  const interactions = useSprintPlannerViewModelInteractions({
    preferences,
    state,
    timeline,
    boardIdForPlannerData,
    boards,
    confirm,
    debouncedUpdateXarrow,
    developersManagement,
    forDemoPlanner,
    getQueueByBoardId,
    onTasksReload,
    sprints,
    trackerLinks,
    workflowScreens,
  });

  const {
    activeTask,
    allTasksForDragWithComments,
    assigneePicker,
    commentActions,
    dragAndDrop,
    dragContextRef,
    featureDraftRowNamesById,
    handleAssigneeSelect,
    handleContextMenuAssigneeSelect,
    handleCreateTaskInSwimlaneCell,
    handleOccupancyPositionSave,
    handleSegmentEditSave,
    handleSplitPhaseIntoSegments,
    handleUpdateEstimate,
    handlers,
    isDragFromSidebar,
    quickAdd,
    setAssigneePicker,
    setIsDragFromSidebar,
    swimlaneTaskLinks,
  } = interactions;
  const onOverdueCloseAndCreate = useCloseOverdueAndCreateNext({
    boardId: boardIdForPlannerData ?? null,
    getQueueByBoardId,
    onStatusChange: handlers.handleStatusChange,
    savePosition: handleOccupancyPositionSave,
    selectedSprintId,
    setTasks: state.board.updateTasks,
  });

  const sidebarOpen = sprintPlannerUi.overlays.sidebarOpen;
  const swimlaneViewMode = viewMode === 'compact' || viewMode === 'full' || viewMode === 'features';
  const draggedNote = activeTask && isSwimlaneCommentTask(activeTask) ? activeTask : null;
  // Окна контекстного меню и выбор исполнителя показывают одно и то же.
  const assigneeOptions = { assigneePointsStats, availability, developers, sprintStartDate };

  // Срезы по потребителю: SprintPlannerView раздаёт их целиком, а не перекладывает поля.
  return {
    assigneePicker: assigneePicker
      ? {
          ...assigneeOptions,
          assigneePicker,
          onAssigneeSelect: handleAssigneeSelect,
          onClose: () => setAssigneePicker(null),
        }
      : null,
    /** Модель доски — для провайдера: листья читают её сами. */
    board: state.board,
    boardViewers,
    comments,
    controls: {
      assigneeFilterTasks: allTasksForDrag,
      boardId: boardIdForPlannerData ?? null,
      boardViewers,
      developers,
      planHistory: positionHistory,
      selectedAssigneeIds,
      selectedSprintId,
      setSelectedAssigneeIds,
      setViewMode,
      sidebarOpen,
      sprints,
      sprintsLoading,
      tasksLoading,
      tasksReloading,
      viewMode,
      onOpenSidebar: sprintPlannerUi.overlays.toggleSidebar,
      onSprintChange,
      onTasksReload,
    },
    dnd: {
      activeTask,
      activeTaskDuration: dragAndDrop.activeTaskDuration,
      developers,
      developersManagement,
      dragAndDrop,
      dragContextRef,
      isDragFromSidebar,
      scrollContainerRef,
      setIsDragFromSidebar,
      sidebarOpen,
      sidebarWidth,
      sprintTimelineWorkingDays,
      viewMode,
    },
    dragStores: {
      hoverStore: dragAndDrop.hoverStore,
      sidebarDropPointerStore: dragAndDrop.sidebarDropPointerStore,
    },
    featureDraftRowNamesById,
    kanban: {
      boardId: boardIdForPlannerData ?? null,
      developers,
      groupBy: kanbanGroupBy,
      selectedAssigneeIds,
      tasks: allTasksForDrag,
      onStatusChange: handlers.handleStatusChange,
    },
    modals: {
      DialogComponent,
      assigneeOptions,
      boardId: boardIdForPlannerData,
      comments,
      handlers,
      movePlacement,
      selectedSprintId,
      showStartLinking: swimlaneViewMode && swimlaneLinksVisible,
      sprintTasks: tasks,
      sprints,
      taskPositions: filteredTaskPositions,
      tasksMap,
      viewMode,
      onAssigneeSelect: handleContextMenuAssigneeSelect,
      onSplitPhaseIntoSegments: handleSplitPhaseIntoSegments,
      onUpdateEstimate: handleUpdateEstimate,
    },
    onboarding: { scrollContainerRef, selectedSprintId, setViewMode, tasksLoading, viewMode },
    onPaintNoteColor: state.board.notes.paintColor,
    placementToolbar: swimlaneViewMode
      ? {
          movePlacement: movePlacement.toolbar,
          pendingAgentNotes: selectPendingAgentProposalNotes(comments),
          sprintId: selectedSprintId,
          variant: viewMode === 'features' ? ('features' as const) : ('people' as const),
          onApproveAgentNotes: state.board.notes.approveAll,
          onRejectAgentNotes: state.board.notes.rejectAll,
        }
      : null,
    presence: {
      dragDuration: dragAndDrop.activeTaskDuration ?? null,
      dragNoteColor: draggedNote ? parseStickyNoteColor(draggedNote.stickyNoteColor) : null,
      dragNoteText: draggedNote ? (draggedNote.name ?? '') : null,
      draggingTaskId: dragAndDrop.isDraggingTask ? dragAndDrop.activeTaskId : null,
      sprintId: selectedSprintId,
      viewMode,
    },
    selectedSprintId,
    sidebar: {
      activeTaskDuration: dragAndDrop.activeTaskDuration,
      activeTaskId: dragAndDrop.activeTaskId,
      allSprintTasks: tasks,
      developersManagement,
      goalTaskIds,
      selectedBoardId: boardIdForPlannerData,
      selectedSprintId,
      sidebarDropTargetActive: dragAndDrop.isSidebarDropTarget,
      sidebarOpen,
      sidebarWidth,
      sprintInfo,
      sprints,
      taskPositions: filteredTaskPositions,
      tasks: unassignedTasks,
      viewMode,
      onAutoAddToSwimlane: handlers.handleAutoAddToSwimlane,
      onAutoAssignTasks: handlers.handleAutoAssignTasks,
      onPlanAssignees: handlers.handlePlanAssignees,
      onReturnAllTasks: handlers.handleReturnAllTasks,
      onSprintTaskUpserted: (task: Task) => {
        state.board.updateTasks((prev) => [...prev.filter((existing) => existing.id !== task.id), task]);
      },
      onTasksReload,
      onToggle: sprintPlannerUi.overlays.toggleSidebar,
      onWidthChange: setSidebarWidth,
    },
    sprints,
    swimlanes: {
      allTasksForDrag: allTasksForDragWithComments ?? allTasksForDrag,
      board: {
        commentActions,
        quickAdd,
        selectedSprintId,
        taskChangelogsByTaskId: swimlaneTaskChangelogsMap,
        taskIssueCommentsByTaskId: swimlaneTaskIssueCommentsMap,
          onCreateQATask: handlers.handleCreateQATask,
        onCreateTaskInCell: handleCreateTaskInSwimlaneCell,
        onOverdueCloseAndCreate,
        onSegmentEditSave: handleSegmentEditSave,
        onTaskResize: handlers.handleTaskResize,
      },
      boardId: boardIdForPlannerData ?? null,
      comments,
      display: {
        commentsVisible: swimlaneNotesVisible || swimlaneImagesVisible,
        factTimelineEnabled: swimlaneFactTimelineEnabled,
        imagesVisible: swimlaneImagesVisible,
        linksDimOnHover,
        linksVisible: swimlaneLinksVisible,
        notesVisible: swimlaneNotesVisible,
      },
      developersManagement,
      dragAndDrop,
      links: {
        items: swimlaneTaskLinks ?? filteredTaskLinks,
        onAdd: trackerLinks.handleAddLink,
        onDelete: handlers.handleDeleteLink,
      },
      participantsColumn: { onWidthChange: setParticipantsColumnWidth, width: participantsColumnWidth },
      removeParticipantFromTeam: handleRemoveParticipantFromTeam,
      scrollContainerRef,
      sprints,
      taskDurationsByTaskId: swimlaneTaskDurationsMap,
      taskPositions,
      tasksByAssignee,
      tasksMap,
      timeline: { boardAvailabilityEvents, sprintStartDate, sprintTimelineWorkingDays },
      onCommentsLeftSprint: state.board.notes.leftSprint,
      onMoveToSprint: handlers.handleMoveToSprint,
      onRemoveFromSprint: handlers.handleRemoveFromSprint,
    },
    viewMode,
  };
}
