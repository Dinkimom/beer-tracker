'use client';

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
import type { ChecklistItem, SprintListItem } from '@/types/tracker';

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
  /** Число задач с учётом поиска и статуса (бейджи Все/Dev/QA и таб «Задачи») */
  allTasksCount: number;

  // BacklogTab
  backlogDevelopers: Developer[];
  backlogHasMore: boolean;
  backlogLoading: boolean;
  backlogTasks: Task[];
  backlogTotalCount: number;
  // GoalsTab
  canEdit: boolean;
  /** Пониженная непрозрачность прочих карточек при контекстном меню с карточки задачи */
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  deliveryChecklistItems: ChecklistItem[];
  deliveryGoalsLoading: boolean;
  deliveryUpdatingItems: Set<string>;
  developers: Developer[];
  /** Dev-задачи после фильтров (поиск, статус) — бейдж вкладки Dev */
  devTasksCount: number;
  discoveryChecklistItems: ChecklistItem[];
  discoveryGoalsLoading: boolean;
  discoveryUpdatingItems: Set<string>;
  goalsLoading: boolean;
  goalsTasks: Task[];
  goalTaskIds: string[];
  groupBy: SidebarGroupBy;
  groupedTasks: Record<string, Task[]>;
  groupKeys: string[];
  hideBacklogTab?: boolean;

  hideTasksTab?: boolean;
  // InvalidTab
  invalidTasks: Array<{ issues: ValidationIssue[]; task: Task }>;
  isBacklogRateLimitError?: boolean;
  isInitialBacklogLoad: boolean;
  mainTab: SidebarMainTab;
  nameFilter: string;
  /** QA-задачи после фильтров (поиск, статус) — бейдж вкладки QA */
  qaTasksCount: number;
  qaTasksMap: Map<string, Task>;
  selectedBoardId?: number | null;
  selectedSprintId?: number | null;
  sidebarDropPointerY?: number | null;
  /** Дроп в неназначенные: показывать слот в списке */
  sidebarDropTargetActive?: boolean;
  sprintInfo: { endDate?: string; id: number; startDate?: string; status: string; version?: number } | null;
  sprints: SprintListItem[];
  statusFilter: StatusFilter;
  /** Позиции карточек (как в свимлейне) — для чеклиста запуска: те же SP/TP, что в заголовке строки */
  taskPositions?: Map<string, TaskPosition> | null;
  viewMode?: LayoutViewMode;
  // Общие
  width: number;
  onAddDeliveryGoal?: (text: string) => Promise<void>;
  onAddDiscoveryGoal?: (text: string) => Promise<void>;
  onAutoAddToSwimlane?: (task: Task) => void;
  onAutoAssignTasks?: () => void;
  onCheckboxChangeDelivery: (itemId: string, checked: boolean) => void;
  onCheckboxChangeDiscovery: (itemId: string, checked: boolean) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean) => void;
  onDeleteDeliveryGoal?: (itemId: string) => Promise<void>;
  onDeleteDiscoveryGoal?: (itemId: string) => Promise<void>;
  onEditDeliveryGoal?: (itemId: string, text: string) => Promise<void>;

  onEditDiscoveryGoal?: (itemId: string, text: string) => Promise<void>;
  onGoalsUpdate?: () => void;
  onLoadMore: () => void;
  onRetryBacklog?: () => void;
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
