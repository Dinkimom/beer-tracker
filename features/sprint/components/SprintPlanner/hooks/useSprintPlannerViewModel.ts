import type { SprintInfo, SprintListItem } from '@/types/tracker';

import {
  useMemo,
  useRef,
} from 'react';
import { useXarrow } from 'react-xarrows';

import { useConfirmDialog } from '@/components/ConfirmDialog';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { useBoards } from '@/features/board/hooks/useBoards';
import { useSprintPlannerTrackerLinkHandlers } from '@/features/sprint/hooks/useSprintPlannerTrackerLinkHandlers';
import { computeAssigneePointsStats } from '@/features/sprint/utils/assigneePointsStats';
import { useLatestCallback } from '@/hooks/useLatestCallback';
import { useDebouncedCallback } from '@/hooks/usePerformance';
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
    syncAssignees,
    syncEstimates,
    kanbanGroupBy,
  } = useSprintPlannerLocalPreferences();

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
    setTaskPositions,
    savePosition,
    deletePosition,
    positionHistory,
    taskLinks,
    setTaskLinks,
    saveLink,
    deleteLink,
    comments,
    setComments,
    deleteComment,
    boardViewers,
    qaTasksMap,
    allTasksForDrag,
    tasksMap,
    qaTasksByOriginalId,
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

  const { availability, boardAvailabilityEvents, sprintStartDate, sprintTimelineWorkingDays } =
    useSprintPlannerTimeline(boardIdForPlannerData, sprintInfo);

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
    allTasksForDrag,
    boardIdForPlannerData,
    boards,
    comments,
    commentsVisible: swimlaneNotesVisible || swimlaneImagesVisible,
    confirm,
    debouncedUpdateXarrow,
    deleteComment,
    deleteLink,
    deleteTrackerOverlayLink,
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
    saveLink: savePlannerLinkOnly,
    savePosition,
    selectedSprintId,
    setComments,
    setTaskLinks,
    setTaskPositions,
    setTasks,
    sprintPlannerUi,
    sprintStartDate,
    sprintTimelineWorkingDays,
    sprints,
    swimlaneImagesVisible,
    swimlaneNotesVisible,
    syncAssignees,
    syncEstimates,
    taskLinks,
    trackerTaskLinks,
    taskPositions,
    tasks,
    tasksMap,
    viewMode,
    workflowScreens,
  });

  return {
    ...interactions,
    DialogComponent,
    allTasksForDrag,
    assigneePointsStats,
    availability,
    boardAvailabilityEvents,
    boardIdForPlannerData,
    boardViewers,
    comments,
    commentsVisible: swimlaneNotesVisible || swimlaneImagesVisible,
    developers,
    developersManagement,
    filteredTaskLinks,
    filteredTaskPositions,
    getQueueByBoardId,
    goalTaskIds,
    handleAddLink,
    handleRemoveParticipantFromTeam,
    kanbanGroupBy,
    linksDimOnHover,
    movePlacement,
    onSprintChange,
    onTasksReload,
    participantsColumnWidth,
    positionHistory,
    qaTasksMap,
    scrollContainerRef,
    selectedAssigneeIds,
    selectedSprintId,
    setParticipantsColumnWidth,
    setSelectedAssigneeIds,
    setSidebarWidth,
    setTasks,
    setViewMode,
    sidebarOpen: sprintPlannerUi.sidebarOpen,
    sidebarWidth,
    sprintInfo,
    sprintStartDate,
    sprintTimelineWorkingDays,
    sprints,
    sprintsLoading,
    swimlaneFactTimelineEnabled,
    swimlaneImagesVisible,
    swimlaneLinksVisible,
    swimlaneNotesVisible,
    swimlaneTaskChangelogsMap,
    swimlaneTaskDurationsMap,
    swimlaneTaskIssueCommentsMap,
    taskPositions,
    tasks,
    tasksByAssignee,
    tasksLoading,
    tasksMap,
    tasksReloading,
    unassignedTasks,
    viewMode,
  };
}
