'use client';

import type { TaskSidebarContextValue } from '@/features/sidebar/contexts/TaskSidebarContext';
import type { Developer, Task, TaskPosition } from '@/types';
import type { ChecklistItem, SprintInfo, SprintListItem } from '@/types/tracker';

import { useDroppable } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useIssueTrackerProviderCapabilities } from '@/contexts/IssueTrackerProviderKindContext';
import { buildTaskSidebarContextValue } from '@/features/sidebar/components/buildTaskSidebarContextValue';
import { SidebarHeader } from '@/features/sidebar/components/SidebarHeader';
import { SidebarTabContent } from '@/features/sidebar/components/SidebarTabContent';
import {
  resolveSidebarCanEdit,
  resolveSidebarGoalTaskIds,
  resolveSidebarGoalsLoading,
  resolveSidebarHeaderSprintInfo,
} from '@/features/sidebar/components/sidebarTaskSidebarHelpers';
import { resolveSidebarTasksToGroup } from '@/features/sidebar/components/sidebarTasksToGroupHelpers';
import { TaskSidebarContext } from '@/features/sidebar/contexts/TaskSidebarContext';
import { useBacklogManagement } from '@/features/sidebar/hooks/useBacklogManagement';
import { useSidebarHeaderTabs } from '@/features/sidebar/hooks/useSidebarHeaderTabs';
import { useSidebarTabsState } from '@/features/sidebar/hooks/useSidebarTabsState';
import { useSlaBugs } from '@/features/sla-bugs/hooks/useSlaBugs';
import { useSprintGoalManagement } from '@/features/sprint/hooks/useSprintGoalManagement';
import { collectInvalidSprintDevTasks } from '@/features/sprint/utils/sprintStartChecks';
import { useTaskFiltering } from '@/features/task/hooks/useTaskFiltering';
import { useTaskGrouping } from '@/features/task/hooks/useTaskGrouping';
import { filterTasksNotOnSwimlane } from '@/features/task/utils/filterTasksNotOnSwimlane';
import { useSidebarGroupByStorage, useSidebarStatusFilterStorage, useSidebarTabsSettingsStorage } from '@/hooks/useLocalStorage';

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
  sidebarDropPointerY?: number | null;
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
  sidebarDropPointerY = null,
}: TaskSidebarProps) {
  const { supportsSlaBugs } = useIssueTrackerProviderCapabilities();
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

  const canEdit = resolveSidebarCanEdit(sprintInfo);

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

  const {
    devTasks,
    qaTasks,
    allTasks,
    allTasksCount,
    devTasksCount,
    qaTasksCount,
  } = useTaskFiltering({
    tasks,
    qaTasksMap,
    statusFilter,
    nameFilter,
    goalTaskIds,
  });

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
  const { data: slaBugsData } = useSlaBugs(
    selectedBoardId,
    supportsSlaBugs && mainTab === 'bugs'
  );
  const bugsTasksCount = filterTasksNotOnSwimlane(
    slaBugsData?.tasks ?? [],
    taskPositions,
    selectedSprintId
  ).length;

  const contextValue: TaskSidebarContextValue = buildTaskSidebarContextValue({
    activeTab,
    activeTaskDuration,
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
    sidebarDropPointerY,
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
    bugsTasksCount,
    sidebarTabsSettings,
    sprintInfo: resolveSidebarHeaderSprintInfo(sprintInfo),
  });

  return (
    <TaskSidebarContext.Provider value={contextValue}>
      <div
        ref={setNodeRef}
        className="flex flex-col h-full min-h-0"
      >
        <SidebarHeader
          mainTab={mainTab}
          setMainTab={setMainTab}
          tabs={headerTabs}
        />
        <SidebarTabContent
          hideBacklogTab={hideBacklogTab}
          mainTab={mainTab}
        />
      </div>
    </TaskSidebarContext.Provider>
  );
}

