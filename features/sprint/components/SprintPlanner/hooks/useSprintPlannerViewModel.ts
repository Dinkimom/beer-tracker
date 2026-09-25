import type { TimelineSettings } from '../occupancy/components/table/OccupancyTableHeader';
import type { Task } from '@/types';
import type { SprintInfo, SprintListItem, ChecklistItem } from '@/types/tracker';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  startTransition,
} from 'react';
import { useXarrow } from 'react-xarrows';

import { useConfirmDialog } from '@/components/ConfirmDialog';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { useBoards } from '@/features/board/hooks/useBoards';
import { useSlaBugs } from '@/features/sla-bugs/hooks/useSlaBugs';
import { computeAssigneePointsStats } from '@/features/sprint/utils/assigneePointsStats';
import { useOccupancyTaskOrderApi } from '@/hooks/useApiStorage';
import { useDebouncedCallback } from '@/hooks/usePerformance';
import { usePlannerIntegrationRules } from '@/hooks/usePlannerIntegrationRules';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import { useRootStore } from '@/lib/layers';
import { DELAYS } from '@/utils/constants';
import { getSprintStartDate, resolveSprintTimelineWorkingDaysCount } from '@/utils/dateUtils';

import { useBoardAvailabilityEvents } from '../../../hooks/useBoardAvailabilityEvents';
import { useDevelopersManagement } from '../../../hooks/useDevelopersManagement';
import { usePlannerNotificationFocus } from '../../../hooks/usePlannerNotificationFocus';
import { useScrollToCurrentDay } from '../../../hooks/useScrollToCurrentDay';

import { useSprintPlannerIntegrationRulesInvalidation } from './useSprintPlannerIntegrationRulesInvalidation';
import { useSprintPlannerLocalPreferences } from './useSprintPlannerLocalPreferences';
import { useSprintPlannerMembersSync } from './useSprintPlannerMembersSync';
import { useSprintPlannerOccupancyAndSwimlaneData } from './useSprintPlannerOccupancyAndSwimlaneData';
import { useSprintPlannerState } from './useSprintPlannerState';
import { useSprintPlannerSyntheticQaCleanup } from './useSprintPlannerSyntheticQaCleanup';
import { useSprintPlannerViewModelInteractions } from './useSprintPlannerViewModelInteractions';
import { useSprintPlannerWorkflowScreens } from './useSprintPlannerWorkflowScreens';

interface UseSprintPlannerViewModelParams {
  checklistDone: number;
  checklistTotal: number;
  deliveryChecklistItems: ChecklistItem[];
  deliveryGoalsLoading: boolean;
  demoPlannerRulesOrganizationId?: string;
  discoveryChecklistItems: ChecklistItem[];
  discoveryGoalsLoading: boolean;
  goalsLoading: boolean;
  goalTaskIds: string[];
  lockedBoardId?: number;
  selectedSprintId: number | null;
  sprintInfo: SprintInfo | null;
  sprints: SprintListItem[];
  sprintsLoading: boolean;
  tasksLoading: boolean;
  tasksReloading: boolean;
  onGoalsUpdate?: () => void;
  onSprintChange: (sprintId: number | null) => void;
  onTasksReload?: (options?: { showToast?: boolean }) => void;
}

export function useSprintPlannerViewModel({
  checklistDone,
  checklistTotal,
  deliveryChecklistItems,
  deliveryGoalsLoading,
  demoPlannerRulesOrganizationId,
  discoveryChecklistItems,
  discoveryGoalsLoading,
  goalTaskIds,
  goalsLoading,
  lockedBoardId,
  onGoalsUpdate,
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
  const updateXarrow = useXarrow();
  const { boards, getQueueByBoardId } = useBoards();
  const { activeOrganizationId: tenantOrganizationId } = useProductTenantOrganizations({
    pollIntervalMs: 0,
  });
  const activeOrganizationId = demoPlannerRulesOrganizationId ?? tenantOrganizationId;
  const { data: plannerIntegrationRules, isFetched: plannerRulesFetched } =
    usePlannerIntegrationRules(activeOrganizationId);

  const debouncedUpdateXarrow = useDebouncedCallback(updateXarrow, 100, {
    leading: true,
    trailing: true,
  });

  const {
    selectedBoardId,
    participantsColumnWidth,
    setParticipantsColumnWidth,
    selectedAssigneeIds,
    setSelectedAssigneeIds,
    timelineSettingsStorage,
    swimlaneLinksVisible,
    swimlaneFactTimelineVisible,
    swimlaneCalendarBusyVisible,
    swimlaneNotesVisible,
    swimlaneImagesVisible,
    linksDimOnHover,
    occupancyOldTmLayout,
    occupancyRowFields,
    occupancyStatusFilter,
    setOccupancyStatusFilter,
    occupancyTimelineScale,
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

  const [taskOrder, setTaskOrder] = useOccupancyTaskOrderApi(selectedSprintId);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { confirmWithAction, DialogComponent, confirm } = useConfirmDialog();

  const timelineSettings: TimelineSettings = {
    showStatuses: timelineSettingsStorage.showStatuses,
    showComments: timelineSettingsStorage.showComments,
    showGitlab: timelineSettingsStorage.showGitlab ?? true,
    showReestimations: timelineSettingsStorage.showReestimations,
    showLinks: timelineSettingsStorage.showLinks ?? true,
    showFreeSlotPreview: timelineSettingsStorage.showFreeSlotPreview ?? true,
  };

  const factVisible = timelineSettingsStorage.enabled;
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
    }
    if (viewMode === 'kanban' || viewMode === 'occupancy') {
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

  const swimlaneCalendarBusyEnabled =
    swimlaneCalendarBusyVisible && (viewMode === 'full' || viewMode === 'compact');

  const loadGitlabFacts =
    viewMode === 'occupancy' &&
    timelineSettingsStorage.enabled &&
    (timelineSettingsStorage.showGitlab ?? true);

  const {
    gitlabFactByLink,
    occupancyTasksLoading,
    swimlaneTaskChangelogsMap,
    swimlaneTaskDurationsMap,
    swimlaneTaskIssueCommentsMap,
    tasksForOccupancy,
  } = useSprintPlannerOccupancyAndSwimlaneData({
    allTasksForDrag,
    loadGitlabFacts,
    occupancyStatusFilter,
    selectedBoardId: boardIdForPlannerData,
    selectedSprintId,
    swimlaneFactTimelineVisible,
    viewMode,
  });

  const handleAddLink = useCallback(
    (link: { fromTaskId: string; toTaskId: string; id: string }) => {
      setTaskLinks((prev) => [...prev, link]);
      saveLink(link).catch((err) => console.error('Error saving link:', err));
    },
    [setTaskLinks, saveLink]
  );

  const backlogTaskRef = useRef<{
    getTask: (taskId: string) => Task | undefined;
    removeTask: (taskId: string) => void;
  } | null>(null);

  const { data: slaBugsData } = useSlaBugs(boardIdForPlannerData, false);
  const slaBugsTasks = slaBugsData?.tasks;

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
      techSprints: [],
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
    checklistDone,
    checklistTotal,
    comments,
    commentsVisible: swimlaneNotesVisible || swimlaneImagesVisible,
    contextMenuBlurOtherCards,
    deliveryChecklistItems,
    deliveryGoalsLoading,
    developers,
    developersManagement,
    discoveryChecklistItems,
    discoveryGoalsLoading,
    factVisible,
    filteredTaskLinks,
    filteredTaskPositions,
    gitlabFactByLink,
    goalTaskIds,
    goalsLoading,
    handleAddLink,
    handleRemoveParticipantFromTeam,
    kanbanGroupBy,
    linksDimOnHover,
    occupancyOldTmLayout,
    occupancyRowFields,
    occupancyStatusFilter,
    occupancyTasksLoading,
    occupancyTimelineScale,
    onGoalsUpdate,
    onSprintChange,
    onTasksReload,
    participantsColumnWidth,
    positionHistory,
    qaTasksMap,
    scrollContainerRef,
    selectedAssigneeIds,
    selectedSprintId,
    setOccupancyStatusFilter,
    setParticipantsColumnWidth,
    setSelectedAssigneeIds,
    setSidebarWidth,
    setTaskOrder,
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
    swimlaneCalendarBusyEnabled,
    swimlaneImagesVisible,
    swimlaneLinksVisible,
    swimlaneNotesVisible,
    swimlaneTaskChangelogsMap,
    swimlaneTaskDurationsMap,
    swimlaneTaskIssueCommentsMap,
    taskOrder,
    taskPositions,
    tasks,
    tasksByAssignee,
    tasksForOccupancy,
    tasksLoading,
    tasksMap,
    tasksReloading,
    timelineSettings,
    unassignedTasks,
    viewMode,
  };
}
