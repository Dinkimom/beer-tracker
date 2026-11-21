'use client';

import type { TaskSidebarContextValue } from '@/features/sidebar/contexts/TaskSidebarContext';
import type { SidebarMainTab } from '@/features/sidebar/hooks/useSidebarTabsState';
import type { DevelopersManagement } from '@/features/sprint/hooks/useDevelopersManagement';
import type { Task, TaskPosition } from '@/types';
import type { SprintInfo, SprintListItem } from '@/types/tracker';

import { useDroppable } from '@dnd-kit/core';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import {
  collectBacklogFilterPeople,
  filterTasksByAssignees,
  selectedAssigneeIdsInPeople,
} from '@/features/backlog/utils/backlogFilterPeople';
import { FLOATING_TOOLBAR_GLASS } from '@/features/context-menu/contextMenuClasses';
import { SidebarHeader } from '@/features/sidebar/components/SidebarHeader';
import { SidebarTabContent } from '@/features/sidebar/components/SidebarTabContent';
import {
  resolveSidebarCanEdit,
  resolveSidebarGoalTaskIds,
  resolveSidebarHeaderSprintInfo,
  resolveSidebarSprintInfoContext,
} from '@/features/sidebar/components/sidebarTaskSidebarHelpers';
import { TaskSidebarContext } from '@/features/sidebar/contexts/TaskSidebarContext';
import { useSidebarHeaderTabs } from '@/features/sidebar/hooks/useSidebarHeaderTabs';
import { useSidebarTabsState } from '@/features/sidebar/hooks/useSidebarTabsState';
import { useSprintGoalsSummary } from '@/features/sprint/hooks/useSprintGoals';
import { useSprintBoard } from '@/features/sprint/model/SprintBoardContext';
import { collectInvalidSprintDevTasks } from '@/features/sprint/utils/sprintStartChecks';
import { useTaskFiltering } from '@/features/task/hooks/useTaskFiltering';
import { useTaskGrouping } from '@/features/task/hooks/useTaskGrouping';
import { useSidebarGroupByStorage, useSidebarStatusFilterStorage, useSidebarTabsSettingsStorage } from '@/hooks/useLocalStorage';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';

function resolveSidebarTasksToGroup(params: {
  activeTab: 'all' | 'dev' | 'qa';
  allTasks: Task[];
  devTasks: Task[];
  invalidTasks: Array<{ task: Task }>;
  mainTab: SidebarMainTab;
  qaTasks: Task[];
}): Task[] {
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

/** Обработчики, которые уходят во вкладки без изменений, — того же типа, что в контексте. */
export interface TaskSidebarProps
  extends Pick<
    TaskSidebarContextValue,
    | 'onAutoAddToSwimlane'
    | 'onAutoAssignTasks'
    | 'onContextMenu'
    | 'onPlanAssignees'
    | 'onReturnAllTasks'
    | 'onSprintTaskUpserted'
    | 'onTasksReload'
  > {
  // ID активной перетаскиваемой задачи
  activeTaskDuration?: number | null;
  // Функция автоматической расстановки задач
  activeTaskId?: string | null;
  /** Все задачи спринта (для метрик «Разбивка по исполнителям» и целей). Передавать полный список. */
  allSprintTasks?: Task[];
  developersManagement?: DevelopersManagement;
  goalTaskIds?: string[];
  hideTasksTab?: boolean;
  // Все задачи спринта (для метрик)
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
}

// observer: QA-задачи для фильтра читаются из модели доски.
export const TaskSidebar = observer(function TaskSidebar({
  tasks,
  allSprintTasks,
  taskPositions = null,
  width = 320,
  onReturnAllTasks,
  onAutoAssignTasks,
  onPlanAssignees,
  activeTaskId,
  activeTaskDuration,
  viewMode = 'full',
  sprintInfo,
  onSprintTaskUpserted,
  onTasksReload,
  goalTaskIds: externalGoalTaskIds,
  developersManagement,
  onContextMenu,
  selectedBoardId,
  selectedSprintId,
  sprints = [],
  hideTasksTab = false,
  onAutoAddToSwimlane,
  sidebarDropTargetActive = false,
}: TaskSidebarProps) {
  const { developers, qaTasksMap } = useSprintBoard();
  const { setNodeRef, isOver } = useDroppable({
    id: 'sidebar-unassigned',
  });

  const { activeTab, mainTab, setActiveTab, setMainTab } = useSidebarTabsState({
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

  // Счётчик целей для шапки; сами цели и правку берёт вкладка «Цели» — из того же кэша.
  const { checklistDone, checklistTotal } = useSprintGoalsSummary(selectedSprintId ?? null);

  const goalTaskIds = resolveSidebarGoalTaskIds(externalGoalTaskIds, allSprintTasks, tasks);

  const invalidTasks = collectInvalidSprintDevTasks(allSprintTasks ?? tasks, goalTaskIds);

  const { activeOrganization } = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const canEdit = resolveSidebarCanEdit(sprintInfo, activeOrganization?.canAccessAdmin === true);

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

  const tasksToGroup = resolveSidebarTasksToGroup({
    activeTab,
    allTasks,
    devTasks,
    invalidTasks,
    mainTab,
    qaTasks,
  });

  // Группируем задачи используя хук
  const { groupedTasks, groupKeys } = useTaskGrouping({
    tasks: tasksToGroup,
    groupBy,
    developers,
    sortedDevelopers: developersManagement?.sortedDevelopers,
  });

  const contextValue: TaskSidebarContextValue = {
    activeTab,
    activeTaskDuration,
    activeTaskId,
    allSprintTasksForMetrics: allSprintTasks,
    allTasksCount,
    assigneeFilterActive: appliedAssigneeIds.size > 0,
    assigneeIds,
    assigneePeople,
    canEdit,
    developers,
    devTasksCount,
    goalsTasks: allSprintTasks ?? tasks,
    goalTaskIds,
    groupBy,
    groupedTasks,
    groupKeys,
    hideTasksTab,
    invalidTasks,
    mainTab,
    nameFilter,
    qaTasksCount,
    selectedBoardId,
    selectedSprintId,
    sidebarDropTargetActive: sidebarDropTargetActive || isOver,
    sprintInfo: resolveSidebarSprintInfoContext(sprintInfo),
    sprints,
    statusFilter,
    taskPositions,
    viewMode,
    width,
    onAssigneeToggle: (id: string) => setAssigneeIds((current) => toggleAssigneeId(current, id)),
    onAutoAddToSwimlane,
    onAutoAssignTasks,
    onContextMenu,
    onPlanAssignees,
    onReturnAllTasks,
    onSprintTaskUpserted,
    onTasksReload,
    setActiveTab,
    setGroupBy,
    setMainTab,
    setNameFilter,
    setStatusFilter,
  };

  const headerTabs = useSidebarHeaderTabs({
    allTasksCount,
    checklistDone,
    checklistTotal,
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
});
