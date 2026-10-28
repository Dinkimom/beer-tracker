'use client';

import type { TaskSidebarContextValue } from '@/features/sidebar/contexts/TaskSidebarContext';
import type { SidebarMainTab } from '@/features/sidebar/hooks/useSidebarTabsState';
import type { Developer, Task, TaskPosition } from '@/types';
import type { ChecklistItem, SprintInfo, SprintListItem } from '@/types/tracker';

import { useDroppable } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  collectBacklogFilterPeople,
  filterTasksByAssignees,
  selectedAssigneeIdsInPeople,
} from '@/features/backlog/utils/backlogFilterPeople';
import { FLOATING_TOOLBAR_GLASS } from '@/features/context-menu/contextMenuClasses';
import { buildTaskSidebarContextValue } from '@/features/sidebar/components/buildTaskSidebarContextValue';
import { SidebarHeader } from '@/features/sidebar/components/SidebarHeader';
import { SidebarTabContent } from '@/features/sidebar/components/SidebarTabContent';
import {
  resolveSidebarCanEdit,
  resolveSidebarGoalTaskIds,
  resolveSidebarGoalsLoading,
  resolveSidebarHeaderSprintInfo,
} from '@/features/sidebar/components/sidebarTaskSidebarHelpers';
import { TaskSidebarContext } from '@/features/sidebar/contexts/TaskSidebarContext';
import { useBacklogManagement } from '@/features/sidebar/hooks/useBacklogManagement';
import { useSidebarHeaderTabs } from '@/features/sidebar/hooks/useSidebarHeaderTabs';
import { useSidebarTabsState } from '@/features/sidebar/hooks/useSidebarTabsState';
import { useSprintGoalManagement } from '@/features/sprint/hooks/useSprintGoalManagement';
import { collectInvalidSprintDevTasks } from '@/features/sprint/utils/sprintStartChecks';
import { useTaskFiltering } from '@/features/task/hooks/useTaskFiltering';
import { useTaskGrouping } from '@/features/task/hooks/useTaskGrouping';
import { useSidebarGroupByStorage, useSidebarStatusFilterStorage, useSidebarTabsSettingsStorage } from '@/hooks/useLocalStorage';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';

function resolveSidebarTasksToGroup(params: {
  activeTab: 'all' | 'dev' | 'qa';
  allTasks: Task[];
  backlogTasks: Task[];
  devTasks: Task[];
  invalidTasks: Array<{ task: Task }>;
  mainTab: SidebarMainTab;
  qaTasks: Task[];
}): Task[] {
  if (params.mainTab === 'backlog') return params.backlogTasks;
  if (params.mainTab === 'invalid') return params.invalidTasks.map(({ task }) => task);
  if (params.mainTab !== 'tasks') return [];
  if (params.activeTab === 'all') return params.allTasks;
  if (params.activeTab === 'dev') return params.devTasks;
  return params.qaTasks;
}

function toggleAssigneeId(current: Set<string>, id: string): Set<string> {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

interface TaskSidebarProps {
  // ID активной перетаскиваемой задачи
  activeTaskDuration?: number | null;
  // Функция автоматической расстановки задач
  activeTaskId?: string | null;
  /** Все задачи спринта (для метрик «Разбивка по исполнителям» и целей). Передавать полный список. */
  allSprintTasks?: Task[];
  // Чеклист целей спринта
  checklistDone?: number;
  checklistTotal?: number;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  deliveryChecklistItems?: ChecklistItem[];
  deliveryGoalsLoading?: boolean;
  developers: Developer[];
  developersManagement?: {
    handleDragEnd: (activeId: string, overId: string) => void;
    hiddenIds: Set<string>;
    hideAllDevelopers: () => void;
    setSortBy: (sort: 'custom' | 'name' | 'sp' | 'tasks' | 'tp') => void;
    showAllDevelopers: () => void;
    sortBy: 'custom' | 'name' | 'sp' | 'tasks' | 'tp';
    toggleDeveloperVisibility: (id: string) => void;
    sortedDevelopers: Developer[];
  };
  discoveryChecklistItems?: ChecklistItem[];
  discoveryGoalsLoading?: boolean;
  goalsLoading?: boolean;
  goalTaskIds?: string[];
  hideBacklogTab?: boolean;
  hideTasksTab?: boolean;
  // Все задачи спринта (для метрик)
  qaTasksMap: Map<string, Task>;
  selectedBoardId?: number | null; // ID выбранной доски для загрузки бэклога
  selectedSprintId?: number | null; // ID текущего спринта для валидации
  /** Дроп в неназначенные: слот в списке задач */
  sidebarDropTargetActive?: boolean;
  sprintInfo?: SprintInfo | null; // Callback для обновления целей
  sprints?: SprintListItem[];
  taskPositions?: Map<string, TaskPosition> | null;
  // Словарь QA задач: ключ - оригинальный ID, значение - QA задача
  tasks: Task[]; // Длительность активной задачи для превью
  viewMode?: 'compact' | 'full';
  width?: number;
  onAutoAddToSwimlane?: (task: Task) => void;
  onAutoAssignTasks?: () => void;
  onBacklogTaskRef?: (ref: { getTask: (taskId: string) => Task | undefined; removeTask: (taskId: string) => void }) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean) => void;
  // Информация о спринте для отображения целей
  onGoalsUpdate?: () => void;
  onPlanAssignees?: (assigneeIds: ReadonlySet<string>) => void;
  onReturnAllTasks?: () => void; // Общее количество целей
  onSprintTaskUpserted?: (task: Task) => void;
  onTasksReload?: () => void;
}

export function TaskSidebar({
  tasks,
  allSprintTasks,
  qaTasksMap,
  taskPositions = null,
  developers,
  width = 320,
  onReturnAllTasks,
  onAutoAssignTasks,
  onPlanAssignees,
  activeTaskId,
  activeTaskDuration,
  viewMode = 'full',
  sprintInfo,
  onGoalsUpdate,
  onSprintTaskUpserted,
  onTasksReload,
  checklistDone: externalChecklistDone = 0,
  checklistTotal: externalChecklistTotal = 0,
  contextMenuBlurOtherCards = false,
  contextMenuTaskId = null,
  deliveryChecklistItems: externalDeliveryChecklistItems = [],
  discoveryChecklistItems: externalDiscoveryChecklistItems = [],
  deliveryGoalsLoading: externalDeliveryGoalsLoading = false,
  discoveryGoalsLoading: externalDiscoveryGoalsLoading = false,
  goalTaskIds: externalGoalTaskIds,
  goalsLoading: externalGoalsLoading = false,
  developersManagement,
  onContextMenu,
  selectedBoardId,
  selectedSprintId,
  sprints = [],
  onBacklogTaskRef,
  hideTasksTab = false,
  hideBacklogTab = false,
  onAutoAddToSwimlane,
  sidebarDropTargetActive = false,
}: TaskSidebarProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'sidebar-unassigned',
  });

  const { activeTab, mainTab, setActiveTab, setMainTab } = useSidebarTabsState({
    hideBacklogTab,
    hideTasksTab,
  });

  const [groupBy, setGroupBy] = useSidebarGroupByStorage();
  const [statusFilter, setStatusFilter] = useSidebarStatusFilterStorage();
  const [nameFilter, setNameFilter] = useState<string>('');
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(() => new Set());
  const [assigneeFilterSprintId, setAssigneeFilterSprintId] = useState(selectedSprintId);
  if (assigneeFilterSprintId !== selectedSprintId) {
    setAssigneeFilterSprintId(selectedSprintId);
    setAssigneeIds(new Set());
  }
  const [sidebarTabsSettings] = useSidebarTabsSettingsStorage();

  const checklistDone = externalChecklistDone;
  const checklistTotal = externalChecklistTotal;
  const deliveryChecklistItems = externalDeliveryChecklistItems;
  const discoveryChecklistItems = externalDiscoveryChecklistItems;
  const goalsLoading = resolveSidebarGoalsLoading(
    externalGoalsLoading,
    externalDeliveryGoalsLoading,
    externalDiscoveryGoalsLoading
  );

  const goalTaskIds = resolveSidebarGoalTaskIds(externalGoalTaskIds, allSprintTasks, tasks);

  const invalidTasks = collectInvalidSprintDevTasks(allSprintTasks ?? tasks, goalTaskIds);

  const { activeOrganization } = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const canEdit = resolveSidebarCanEdit(sprintInfo, activeOrganization?.canAccessAdmin === true);

  const queryClient = useQueryClient();

  const deliveryGoalManagement = useSprintGoalManagement({
    goalType: 'delivery',
    sprintId: selectedSprintId ?? null,
    boardId: selectedBoardId ?? null,
    queryClient,
    onGoalsUpdate,
  });

  const discoveryGoalManagement = useSprintGoalManagement({
    goalType: 'discovery',
    sprintId: selectedSprintId ?? null,
    boardId: selectedBoardId ?? null,
    queryClient,
    onGoalsUpdate,
  });

  const taskFiltering = useTaskFiltering({
    tasks,
    qaTasksMap,
    statusFilter,
    nameFilter,
    goalTaskIds,
  });
  const assigneePeople = collectBacklogFilterPeople({
    backlogDevelopers: developers,
    backlogTasks: [...taskFiltering.devTasksUnfiltered, ...taskFiltering.qaTasksUnfiltered],
    sprintBundles: [],
  });
  const appliedAssigneeIds = selectedAssigneeIdsInPeople(assigneeIds, assigneePeople);
  const devTasks = filterTasksByAssignees(taskFiltering.devTasks, appliedAssigneeIds);
  const qaTasks = filterTasksByAssignees(taskFiltering.qaTasks, appliedAssigneeIds);
  const allTasks = [...devTasks, ...qaTasks];
  const devTasksCount = devTasks.length;
  const qaTasksCount = qaTasks.length;
  const allTasksCount = allTasks.length;

  const backlogManagement = useBacklogManagement({
    selectedBoardId,
    mainTab,
    statusFilter,
    nameFilter,
    goalTaskIds,
    onBacklogTaskRef,
  });

  const tasksToGroup = resolveSidebarTasksToGroup({
    activeTab,
    allTasks,
    backlogTasks: backlogManagement.filteredBacklogTasks,
    devTasks,
    invalidTasks,
    mainTab,
    qaTasks,
  });

  const developersForGrouping = mainTab === 'backlog' ? backlogManagement.backlogDevelopers : developers;

  // Группируем задачи используя хук
  const { groupedTasks, groupKeys } = useTaskGrouping({
    tasks: tasksToGroup,
    groupBy,
    developers: developersForGrouping,
    sortedDevelopers: developersManagement?.sortedDevelopers,
  });

  const contextValue: TaskSidebarContextValue = buildTaskSidebarContextValue({
    activeTab,
    activeTaskDuration,
    assigneeFilterActive: appliedAssigneeIds.size > 0,
    assigneeIds,
    assigneePeople,
    onAssigneeToggle: (id: string) => setAssigneeIds((current) => toggleAssigneeId(current, id)),
    activeTaskId,
    allSprintTasks,
    allTasksCount,
    backlogDevelopers: backlogManagement.backlogDevelopers,
    backlogHasMore: backlogManagement.backlogHasMore,
    backlogLoading: backlogManagement.backlogLoading,
    backlogManagement,
    backlogTasks: backlogManagement.backlogTasks,
    backlogTotalCount: backlogManagement.backlogTotalCount,
    canEdit,
    contextMenuBlurOtherCards,
    contextMenuTaskId,
    deliveryChecklistItems,
    deliveryGoalManagement,
    deliveryGoalsLoading: externalDeliveryGoalsLoading,
    developers,
    devTasksCount,
    discoveryChecklistItems,
    discoveryGoalManagement,
    discoveryGoalsLoading: externalDiscoveryGoalsLoading,
    goalTaskIds,
    goalsLoading,
    groupBy,
    groupedTasks,
    groupKeys,
    hideBacklogTab,
    hideTasksTab,
    invalidTasks,
    isOver,
    mainTab,
    nameFilter,
    onAutoAddToSwimlane,
    onAutoAssignTasks,
    onPlanAssignees,
    onContextMenu,
    onGoalsUpdate,
    onReturnAllTasks,
    onSprintTaskUpserted,
    onTasksReload,
    qaTasksCount,
    qaTasksMap,
    selectedBoardId,
    selectedSprintId,
    setActiveTab,
    setGroupBy,
    setMainTab,
    setNameFilter,
    setStatusFilter,
    sidebarDropTargetActive,
    sprintInfo,
    sprints,
    statusFilter,
    taskPositions,
    tasks,
    viewMode,
    width,
  });

  const headerTabs = useSidebarHeaderTabs({
    allTasksCount,
    checklistDone,
    checklistTotal,
    hideBacklogTab,
    hideTasksTab,
    invalidTasksCount: invalidTasks.length,
    sidebarTabsSettings,
    sprintInfo: resolveSidebarHeaderSprintInfo(sprintInfo),
  });

  return (
    <TaskSidebarContext.Provider value={contextValue}>
      <div
        ref={setNodeRef}
        className="relative flex h-full min-h-0 flex-col"
      >
        <SidebarTabContent
          hideBacklogTab={hideBacklogTab}
          mainTab={mainTab}
        />
        <div className={`absolute inset-x-0 top-0 z-20 ${FLOATING_TOOLBAR_GLASS}`}>
          <SidebarHeader
            mainTab={mainTab}
            setMainTab={setMainTab}
            tabs={headerTabs}
          />
        </div>
      </div>
    </TaskSidebarContext.Provider>
  );
}

