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
    developers,
    tasks,
    setTasks,
    sidebarWidth,
    setSidebarWidth,
    viewMode,
    setViewMode,
    isMounted,
    taskPositions,
    deletePosition,
    positionHistory,
    taskLinks,
    setTaskLinks,
    saveLink,
    comments,
    boardViewers,
    allTasksForDrag,
    tasksMap,
    unassignedTasks,
    tasksByAssignee,
    filteredTaskPositions,
    filteredTaskLinks,
  } = state;

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

  const {
    deleteTrackerOverlayLink,
    handleAddLink,
    savePlannerLinkOnly,
    trackerTaskLinks,
  } = useSprintPlannerTrackerLinkHandlers({
    allTasksForDrag,
    enabled: swimlaneLinksVisible && (viewMode === 'full' || viewMode === 'compact'),
    saveLink,
    selectedSprintId,
    setTaskLinks,
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
    deletePosition,
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
    comments,
    developers: developersManagement.sortedDevelopers,
    scrollContainerRef,
    selectedSprintId,
    sprints,
    taskLinks,
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
    deleteTrackerOverlayLink,
    developersManagement,
    forDemoPlanner,
    getQueueByBoardId,
    onTasksReload,
    saveLink: savePlannerLinkOnly,
    selectedSprintId,
    sprintPlannerUi,
    sprints,
    trackerTaskLinks,
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
    setTasks,
  });

  const sidebarOpen = sprintPlannerUi.sidebarOpen;
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
      onOpenSidebar: handlers.handleToggleSidebar,
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
      onContextMenu: handlers.handleContextMenu,
      onStatusChange: handlers.handleStatusChange,
      onTaskClick: handlers.handleTaskClick,
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
    onPaintNoteColor: handlers.handlePaintNoteColorFromReaction,
    placementToolbar: swimlaneViewMode
      ? {
          movePlacement: movePlacement.toolbar,
          pendingAgentNotes: selectPendingAgentProposalNotes(comments),
          sprintId: selectedSprintId,
          variant: viewMode === 'features' ? ('features' as const) : ('people' as const),
          onApproveAgentNotes: handlers.handleCommentApproveAll,
          onRejectAgentNotes: handlers.handleCommentRejectAll,
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
      developers,
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
      onContextMenu: handlers.handleContextMenu,
      onPlanAssignees: handlers.handlePlanAssignees,
      onReturnAllTasks: handlers.handleReturnAllTasks,
      onSprintTaskUpserted: (task: Task) => {
        setTasks((prev) => [...prev.filter((existing) => existing.id !== task.id), task]);
      },
      onTasksReload,
      onToggle: handlers.handleToggleSidebar,
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
        onCloseSidebar: handlers.handleCloseSidebar,
        onContextMenu: handlers.handleContextMenu,
        onCreateQATask: handlers.handleCreateQATask,
        onCreateTaskInCell: handleCreateTaskInSwimlaneCell,
        onOverdueCloseAndCreate,
        onSegmentEditSave: handleSegmentEditSave,
        onTaskResize: handlers.handleTaskResize,
      },
      boardAvailabilityEvents,
      boardId: boardIdForPlannerData ?? null,
      comments,
      developers,
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
      filteredTaskLinks: swimlaneTaskLinks ?? filteredTaskLinks,
      participantsColumnWidth,
      removeParticipantFromTeam: handleRemoveParticipantFromTeam,
      scrollContainerRef,
      setTasks,
      sidebarOpen,
      sprintStartDate,
      sprintTimelineWorkingDays,
      sprints,
      taskDurationsByTaskId: swimlaneTaskDurationsMap,
      taskPositions,
      tasksByAssignee,
      tasksMap,
      onAddLink: handleAddLink,
      onCommentsLeftSprint: handlers.handleCommentsLeftSprint,
      onDeleteLink: handlers.handleDeleteLink,
      onMoveToSprint: handlers.handleMoveToSprint,
      onParticipantsColumnWidthChange: setParticipantsColumnWidth,
      onRemoveFromSprint: handlers.handleRemoveFromSprint,
      onTaskClick: handlers.handleTaskClick,
    },
    viewMode,
  };
}
