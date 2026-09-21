import type { TaskSidebarContextValue } from '@/features/sidebar/contexts/TaskSidebarContext';
import type { SidebarMainTab } from '@/features/sidebar/hooks/useSidebarTabsState';
import type { ValidationIssue } from '@/features/task/utils/taskValidation';
import type {
  Developer,
  LayoutViewMode,
  SidebarGroupBy,
  SidebarTasksTab,
  StatusFilter,
  Task,
  TaskPosition,
} from '@/types';
import type { ChecklistItem, SprintInfo, SprintListItem } from '@/types/tracker';

import {
  resolveSidebarSprintInfoContext,
  whenSidebarCanEdit,
} from './sidebarTaskSidebarHelpers';

interface BuildTaskSidebarContextValueParams {
  activeTab: SidebarTasksTab;
  activeTaskDuration?: number | null;
  activeTaskId?: string | null;
  allSprintTasks?: Task[];
  allTasksCount: number;
  backlogDevelopers: Developer[];
  backlogHasMore: boolean;
  backlogLoading: boolean;
  backlogManagement: {
    backlogDevelopers: Developer[];
    backlogHasMore: boolean;
    backlogLoading: boolean;
    backlogTasks: Task[];
    backlogTotalCount: number;
    isBacklogRateLimitError?: boolean;
    isInitialBacklogLoad: boolean;
    loadMoreBacklogTasks: () => void;
    refetchBacklog?: () => void;
  };
  backlogTasks: Task[];
  backlogTotalCount: number;
  canEdit: boolean;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  deliveryChecklistItems: ChecklistItem[];
  deliveryGoalManagement: {
    handleAddGoal: (text: string) => Promise<void>;
    handleCheckboxChange: (itemId: string, checked: boolean) => void;
    handleDeleteGoal: (itemId: string) => Promise<void>;
    handleEditGoal: (itemId: string, text: string) => Promise<void>;
    updatingItems: Set<string>;
  };
  deliveryGoalsLoading: boolean;
  developers: Developer[];
  devTasksCount: number;
  discoveryChecklistItems: ChecklistItem[];
  discoveryGoalManagement: {
    handleAddGoal: (text: string) => Promise<void>;
    handleCheckboxChange: (itemId: string, checked: boolean) => void;
    handleDeleteGoal: (itemId: string) => Promise<void>;
    handleEditGoal: (itemId: string, text: string) => Promise<void>;
    updatingItems: Set<string>;
  };
  discoveryGoalsLoading: boolean;
  goalsLoading: boolean;
  goalTaskIds: string[];
  groupBy: SidebarGroupBy;
  groupedTasks: Record<string, Task[]>;
  groupKeys: string[];
  hideBacklogTab?: boolean;
  hideTasksTab?: boolean;
  invalidTasks: Array<{ issues: ValidationIssue[]; task: Task }>;
  isOver: boolean;
  mainTab: SidebarMainTab;
  nameFilter: string;
  qaTasksCount: number;
  qaTasksMap: Map<string, Task>;
  selectedBoardId?: number | null;
  selectedSprintId?: number | null;
  sidebarDropPointerY?: number | null;
  sidebarDropTargetActive?: boolean;
  sprintInfo?: SprintInfo | null;
  sprints: SprintListItem[];
  statusFilter: StatusFilter;
  taskPositions?: Map<string, TaskPosition> | null;
  tasks: Task[];
  viewMode?: LayoutViewMode;
  width: number;
  onAutoAddToSwimlane?: (task: Task) => void;
  onAutoAssignTasks?: () => void;
  onContextMenu?: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean) => void;
  onGoalsUpdate?: () => void;
  onReturnAllTasks?: () => void;
  onSprintTaskUpserted?: (task: Task) => void;
  onTasksReload?: () => void;
  setActiveTab: (tab: SidebarTasksTab) => void;
  setGroupBy: (value: SidebarGroupBy) => void;
  setMainTab: (tab: SidebarMainTab) => void;
  setNameFilter: (value: string) => void;
  setStatusFilter: (value: StatusFilter) => void;
}

export function buildTaskSidebarContextValue(
  params: BuildTaskSidebarContextValueParams,
): TaskSidebarContextValue {
  const { canEdit, deliveryGoalManagement, discoveryGoalManagement } = params;

  return {
    width: params.width,
    contextMenuBlurOtherCards: params.contextMenuBlurOtherCards,
    contextMenuTaskId: params.contextMenuTaskId,
    mainTab: params.mainTab,
    setMainTab: params.setMainTab,
    hideBacklogTab: params.hideBacklogTab,
    hideTasksTab: params.hideTasksTab,
    activeTab: params.activeTab,
    setActiveTab: params.setActiveTab,
    groupBy: params.groupBy,
    setGroupBy: params.setGroupBy,
    statusFilter: params.statusFilter,
    setStatusFilter: params.setStatusFilter,
    nameFilter: params.nameFilter,
    setNameFilter: params.setNameFilter,
    allTasksCount: params.allTasksCount,
    devTasksCount: params.devTasksCount,
    qaTasksCount: params.qaTasksCount,
    groupKeys: params.groupKeys,
    groupedTasks: params.groupedTasks,
    developers: params.developers,
    qaTasksMap: params.qaTasksMap,
    taskPositions: params.taskPositions,
    activeTaskId: params.activeTaskId,
    activeTaskDuration: params.activeTaskDuration,
    viewMode: params.viewMode,
    selectedBoardId: params.selectedBoardId,
    selectedSprintId: params.selectedSprintId,
    onContextMenu: params.onContextMenu,
    onReturnAllTasks: params.onReturnAllTasks,
    onAutoAddToSwimlane: params.onAutoAddToSwimlane,
    onAutoAssignTasks: params.onAutoAssignTasks,
    canEdit,
    deliveryChecklistItems: params.deliveryChecklistItems,
    deliveryGoalsLoading: params.deliveryGoalsLoading,
    deliveryUpdatingItems: deliveryGoalManagement.updatingItems,
    discoveryChecklistItems: params.discoveryChecklistItems,
    discoveryGoalsLoading: params.discoveryGoalsLoading,
    discoveryUpdatingItems: discoveryGoalManagement.updatingItems,
    goalsLoading: params.goalsLoading,
    goalTaskIds: params.goalTaskIds,
    sprintInfo: resolveSidebarSprintInfoContext(params.sprintInfo),
    sprints: params.sprints,
    allSprintTasksForMetrics: params.allSprintTasks,
    goalsTasks: params.allSprintTasks ?? params.tasks,
    onAddDeliveryGoal: whenSidebarCanEdit(canEdit, deliveryGoalManagement.handleAddGoal),
    onAddDiscoveryGoal: whenSidebarCanEdit(canEdit, discoveryGoalManagement.handleAddGoal),
    onCheckboxChangeDelivery: deliveryGoalManagement.handleCheckboxChange,
    onCheckboxChangeDiscovery: discoveryGoalManagement.handleCheckboxChange,
    onDeleteDeliveryGoal: whenSidebarCanEdit(canEdit, deliveryGoalManagement.handleDeleteGoal),
    onDeleteDiscoveryGoal: whenSidebarCanEdit(canEdit, discoveryGoalManagement.handleDeleteGoal),
    onEditDeliveryGoal: whenSidebarCanEdit(canEdit, deliveryGoalManagement.handleEditGoal),
    onEditDiscoveryGoal: whenSidebarCanEdit(canEdit, discoveryGoalManagement.handleEditGoal),
    onGoalsUpdate: params.onGoalsUpdate,
    onSprintTaskUpserted: params.onSprintTaskUpserted,
    onTasksReload: params.onTasksReload,
    backlogDevelopers: params.backlogDevelopers,
    backlogHasMore: params.backlogHasMore,
    backlogLoading: params.backlogLoading,
    backlogTasks: params.backlogTasks,
    backlogTotalCount: params.backlogTotalCount,
    isBacklogRateLimitError: params.backlogManagement.isBacklogRateLimitError,
    isInitialBacklogLoad: params.backlogManagement.isInitialBacklogLoad,
    onLoadMore: params.backlogManagement.loadMoreBacklogTasks,
    onRetryBacklog: params.backlogManagement.refetchBacklog,
    invalidTasks: params.invalidTasks,
    sidebarDropTargetActive: params.sidebarDropTargetActive || params.isOver,
    sidebarDropPointerY: params.sidebarDropPointerY,
  };
}
