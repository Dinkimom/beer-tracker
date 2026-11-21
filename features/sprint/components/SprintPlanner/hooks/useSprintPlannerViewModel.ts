import type { Task } from '@/types';
import type { BoardAvailabilityEvent } from '@/types/quarterly';
import type { SprintInfo, SprintListItem } from '@/types/tracker';

import { useQuery } from '@tanstack/react-query';
import {
  useEffect,
  useMemo,
  useRef,
  startTransition,
} from 'react';
import { useXarrow } from 'react-xarrows';

import { useConfirmDialog } from '@/components/ConfirmDialog';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { useBoards } from '@/features/board/hooks/useBoards';
import { useSprintPlannerTrackerLinkHandlers } from '@/features/sprint/hooks/useSprintPlannerTrackerLinkHandlers';
import { computeAssigneePointsStats } from '@/features/sprint/utils/assigneePointsStats';
import { useLatestCallback } from '@/hooks/useLatestCallback';
import { useDebouncedCallback } from '@/hooks/usePerformance';
import { usePlannerIntegrationRules } from '@/hooks/usePlannerIntegrationRules';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import { fetchBoardAvailabilityEventsForBoard } from '@/lib/beerTrackerApi';
import { useRootStore } from '@/lib/layers';
import { DELAYS } from '@/utils/constants';
import { getSprintStartDate, resolveSprintTimelineWorkingDaysCount } from '@/utils/dateUtils';

import { useDevelopersManagement } from '../../../hooks/useDevelopersManagement';
import { usePlannerNotificationFocus } from '../../../hooks/usePlannerNotificationFocus';
import { useScrollToCurrentDay } from '../../../hooks/useScrollToCurrentDay';

import { useSprintMovePlacement } from './useSprintMovePlacement';
import { useSprintPlannerIntegrationRulesInvalidation } from './useSprintPlannerIntegrationRulesInvalidation';
import { useSprintPlannerLocalPreferences } from './useSprintPlannerLocalPreferences';
import { useSprintPlannerMembersSync } from './useSprintPlannerMembersSync';
import { useSprintPlannerState } from './useSprintPlannerState';
import { useSprintPlannerSwimlaneData } from './useSprintPlannerSwimlaneData';
import { useSprintPlannerSyntheticQaCleanup } from './useSprintPlannerSyntheticQaCleanup';
import { useSprintPlannerViewModelInteractions } from './useSprintPlannerViewModelInteractions';
import { useSprintPlannerWorkflowScreens } from './useSprintPlannerWorkflowScreens';
import { useTrackerSyncFailureToasts } from './useTrackerSyncFailureToasts';

function useBoardAvailabilityEvents(boardId: number | null) {
  return useQuery({
    queryKey: ['boardAvailabilityEvents', boardId],
    queryFn: async (): Promise<BoardAvailabilityEvent[]> => {
      if (!boardId) return [];
      return await fetchBoardAvailabilityEventsForBoard(boardId);
    },
    enabled: boardId != null,
    staleTime: 1000 * 60 * 2,
  });
}

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
  const { activeOrganizationId: tenantOrganizationId } = useProductTenantOrganizations({
    pollIntervalMs: 0,
  });
  const activeOrganizationId = demoPlannerRulesOrganizationId ?? tenantOrganizationId;
  const { data: plannerIntegrationRules, isFetched: plannerRulesFetched } =
    usePlannerIntegrationRules(activeOrganizationId);

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

  useSprintPlannerIntegrationRulesInvalidation({
    activeOrganizationId,
    boardIdForPlannerData,
    plannerIntegrationRules,
    plannerRulesFetched,
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

  useTrackerSyncFailureToasts();

  useSprintPlannerSyntheticQaCleanup({
    deletePosition,
    selectedSprintId,
    taskPositions,
    tasks,
    testingFlowMode: plannerIntegrationRules?.testingFlowMode,
  });

  useEffect(() => {
    if (viewMode === 'kanban') {
      sprintPlannerUi.setSegmentEditTaskId(null);
      sprintPlannerUi.setPlacementTool('cursor');
    }
    if (viewMode === 'features' && sprintPlannerUi.placementTool === 'availability') {
      sprintPlannerUi.setPlacementTool('cursor');
    }
  }, [viewMode, sprintPlannerUi]);

  const contextMenuBlurOtherCards =
    Boolean(sprintPlannerUi.contextMenu?.anchorRect) &&
    sprintPlannerUi.contextMenu?.dimPeerUi !== false;

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

  const backlogTaskRef = useRef<{
    getTask: (taskId: string) => Task | undefined;
    removeTask: (taskId: string) => void;
  } | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      debouncedUpdateXarrow();
    }, DELAYS.UI_UPDATE);
    return () => clearTimeout(timeoutId);
  }, [debouncedUpdateXarrow]);

  useEffect(() => {
    startTransition(() => {
      sprintPlannerUi.clearTransientUiOnSprintChange();
    });
  }, [selectedSprintId, sprintPlannerUi]);

  const assigneePointsStats = useMemo(
    () => computeAssigneePointsStats(filteredTaskPositions, tasksMap),
    [filteredTaskPositions, tasksMap]
  );

  const sprintStartDate = useMemo(() => {
    return sprintInfo?.startDate ? new Date(sprintInfo.startDate) : getSprintStartDate();
  }, [sprintInfo]);

  const sprintTimelineWorkingDays = useMemo(
    () => resolveSprintTimelineWorkingDaysCount(sprintInfo?.startDate, sprintInfo?.endDate),
    [sprintInfo?.endDate, sprintInfo?.startDate]
  );

  const { data: boardAvailabilityEvents = [] } = useBoardAvailabilityEvents(
    boardIdForPlannerData ?? null
  );
  const availability = useMemo(() => {
    if (!boardIdForPlannerData) return null;
    return {
      planId: `board-${boardIdForPlannerData}`,
      boardEvents: boardAvailabilityEvents,
      vacations: [],
    };
  }, [boardAvailabilityEvents, boardIdForPlannerData]);

  useScrollToCurrentDay({
    isMounted,
    viewMode,
    sprintInfo,
    selectedSprintId,
    sprints,
    scrollContainerRef,
  });

  usePlannerNotificationFocus({
    isMounted,
    plannerDataReady: isMounted,
    scrollContainerRef,
    setViewMode,
    sprintPlannerUi,
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
    backlogTaskRef,
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
    backlogTaskRef,
    boardIdForPlannerData,
    boardViewers,
    comments,
    commentsVisible: swimlaneNotesVisible || swimlaneImagesVisible,
    contextMenuBlurOtherCards,
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
