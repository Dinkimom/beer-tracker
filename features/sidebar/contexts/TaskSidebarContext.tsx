'use client';

import type { BacklogFilterPerson } from '@/features/backlog/utils/backlogFilterPeople';
import type { BacklogManagement } from '@/features/sidebar/hooks/useBacklogManagement';
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
import type { SprintListItem } from '@/types/tracker';

import React from 'react';

/**
 * Контекст сайдбара планировщика спринта.
 * Содержит данные и колбэки для табов (Задачи, Цели, Бэклог, Невалидные, Метрики).
 * Убирает необходимость прокидывать десятки пропсов в каждый таб.
 */
export interface TaskSidebarContextValue {
  // TasksTab
  activeTab: SidebarTasksTab;
  activeTaskDuration?: number | null;
  activeTaskId?: string | null;
  /** Все задачи спринта для метрик (разбивка по исполнителям, итоги). Если не передано — используется goalsTasks. */
  allSprintTasksForMetrics?: Task[];
  /** Число задач с учётом поиска, статуса и исполнителей (бейджи Все/Dev/QA и таб «Задачи») */
  allTasksCount: number;
  /** Фильтр по исполнителям сужает список задач таба. */
  assigneeFilterActive: boolean;
  assigneeIds: ReadonlySet<string>;
  assigneePeople: BacklogFilterPerson[];

  /** Бэклог доски — результат `useBacklogManagement` как есть. */
  backlog: BacklogManagement;
  /** Править цели можно (драфт, админ в работе, первый понедельник). */
  canEdit: boolean;
  /** Пониженная непрозрачность прочих карточек при контекстном меню с карточки задачи */
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  developers: Developer[];
  /** Dev-задачи после фильтров (поиск, статус) — бейдж вкладки Dev */
  devTasksCount: number;
  goalsTasks: Task[];
  goalTaskIds: string[];
  groupBy: SidebarGroupBy;
  groupedTasks: Record<string, Task[]>;
  groupKeys: string[];
  hideBacklogTab?: boolean;

  hideTasksTab?: boolean;
  // InvalidTab
  invalidTasks: Array<{ issues: ValidationIssue[]; task: Task }>;
  mainTab: SidebarMainTab;
  nameFilter: string;
  /** QA-задачи после фильтров (поиск, статус) — бейдж вкладки QA */
  qaTasksCount: number;
  qaTasksMap: Map<string, Task>;
  selectedBoardId?: number | null;
  selectedSprintId?: number | null;
  /** Дроп в неназначенные: показывать слот в списке */
  sidebarDropTargetActive?: boolean;
  sprintInfo: { endDate?: string; id: number; startDate?: string; status: string; version?: number } | null;
  sprints: SprintListItem[];
  statusFilter: StatusFilter;
  /** Позиции карточек на свимлейне — вкладка багов скрывает уже разложенные задачи */
  taskPositions?: Map<string, TaskPosition> | null;
  viewMode?: LayoutViewMode;
  // Общие
  width: number;
  onAssigneeToggle: (id: string) => void;
  onAutoAddToSwimlane?: (task: Task) => void;
  onAutoAssignTasks?: () => void;
  onContextMenu?: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean) => void;

  onPlanAssignees?: (assigneeIds: ReadonlySet<string>) => void;
  onReturnAllTasks?: () => void;
  /** Оптимистично добавить задачу в локальный список спринта (таб «Задачи»). */
  onSprintTaskUpserted?: (task: Task) => void;
  onTasksReload?: () => void;
  setActiveTab: (tab: SidebarTasksTab) => void;
  setGroupBy: (value: SidebarGroupBy) => void;
  setMainTab: (tab: SidebarMainTab) => void;

  // MetricsTab (goalsTasks + goalTaskIds + developers уже выше)

  setNameFilter: (value: string) => void;
  setStatusFilter: (value: StatusFilter) => void;
}

const TaskSidebarContext = React.createContext<TaskSidebarContextValue | null>(null);

export { TaskSidebarContext };

export function useTaskSidebar(): TaskSidebarContextValue {
  const ctx = React.useContext(TaskSidebarContext);
  if (!ctx) {
    throw new Error('useTaskSidebar must be used within TaskSidebarProvider');
  }
  return ctx;
}
