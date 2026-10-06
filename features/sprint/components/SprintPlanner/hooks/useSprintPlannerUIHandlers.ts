/**
 * Хук для UI обработчиков в SprintPlanner (контекстное меню, сайдбар, автоматическая расстановка)
 */

import type { TransitionField } from '@/lib/beerTrackerApi';
import type { Developer, Task, TaskPosition } from '@/types';
import type { MutableRefObject } from 'react';

import { useCallback } from 'react';
import toast from 'react-hot-toast';

import { getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  buildAssigneePlanDraft,
  positionsOmittingIds,
} from '@/features/task/utils/planAssigneeDraft';
import { useRootStore } from '@/lib/layers';
import { getCurrentSprintCell } from '@/utils/dateUtils';

import { useSprintPlannerAutoAssignHandlers } from './useSprintPlannerUIHandlers/hooks/useSprintPlannerAutoAssignHandlers';
import { useSprintPlannerContextMenuHandlers } from './useSprintPlannerUIHandlers/hooks/useSprintPlannerContextMenuHandlers';
import { useSprintPlannerSidebarHandlers } from './useSprintPlannerUIHandlers/hooks/useSprintPlannerSidebarHandlers';
import { useSprintPlannerTaskInteractionHandlers } from './useSprintPlannerUIHandlers/hooks/useSprintPlannerTaskInteractionHandlers';
import { useTransitionModal } from './useTransitionModal';

interface UseSprintPlannerUIHandlersProps {
  allTasksForDrag: Task[];
  developersManagement: {
    sortedDevelopers: Developer[];
  };
  qaTasksByOriginalId: Map<string, Task>;
  qaTasksMap: Map<string, Task>;
  resetDragStateRef: MutableRefObject<(() => void) | null>;
  selectedSprintId: number | null;
  sprintStartDate: Date;
  sprintTimelineWorkingDays: number;
  taskOperations: {
    changeStatus: (taskId: string, transitionId: string, targetStatusKey?: string, extraFields?: Record<string, unknown>) => Promise<void>;
    moveToSprint: (taskId: string, sprintId: number) => Promise<void>;
    removeFromSprint: (taskId: string) => Promise<void>;
  };
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  tasksMap: Map<string, Task>;
  /** Экранные поля переходов для очереди (typeKey -> transitionId -> fields) */
  workflowScreens?: Record<string, Record<string, TransitionField[]>>;
  confirm: (message: string, options?: {
    title?: string;
    variant?: 'default' | 'destructive';
  }) => Promise<boolean>;
  debouncedUpdateXarrow: () => void;
  onTasksReload?: () => void;
  saveLink: (link: { fromTaskId: string; toTaskId: string; id: string }) => Promise<void>;
  savePosition: (position: TaskPosition, isQa: boolean) => Promise<void>;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setTaskLinks: (updater: (prev: Array<{
    fromTaskId: string;
    toTaskId: string;
    id: string;
  }>) => Array<{
    fromTaskId: string;
    toTaskId: string;
    id: string;
  }>) => void;
  setTaskPositions: (updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

export function useSprintPlannerUIHandlers({
  allTasksForDrag,
  developersManagement,
  resetDragStateRef,
  qaTasksByOriginalId,
  qaTasksMap,
  selectedSprintId,
  setSidebarOpen,
  setTaskLinks,
  setTaskPositions,
  setTasks,
  sprintStartDate,
  sprintTimelineWorkingDays,
  taskOperations,
  taskPositions,
  tasks,
  tasksMap,
  confirm,
  debouncedUpdateXarrow,
  onTasksReload,
  saveLink,
  savePosition,
  workflowScreens = {},
}: UseSprintPlannerUIHandlersProps) {
  const { t } = useI18n();
  const { taskPositions: positionsStore } = useRootStore();
  // Обработчики контекстного меню
  const { handleContextMenu, handleParentChange } = useSprintPlannerContextMenuHandlers({
    onParentLayoutChanged: debouncedUpdateXarrow,
    selectedSprintId,
    setTasks,
  });

  // Обработчики сайдбара
  const { handleCloseSidebar, handleToggleSidebar } = useSprintPlannerSidebarHandlers({
    setSidebarOpen,
  });

  // Обработчики автоматической расстановки
  const { handleAutoAssignTasks, handleReturnAllTasks } = useSprintPlannerAutoAssignHandlers({
    allTasksForDrag,
    developersManagement,
    resetDragStateRef,
    qaTasksByOriginalId,
    qaTasksMap,
    selectedSprintId,
    setTaskLinks,
    setTaskPositions,
    sprintStartDate,
    taskPositions,
    tasksMap,
    confirm,
    debouncedUpdateXarrow,
    saveLink,
    savePosition,
  });

  // Обработчики взаимодействия с задачами
  const { handleAccountWork, handleTaskClick, handleTaskInfoFieldsSaved } =
    useSprintPlannerTaskInteractionHandlers({
      selectedSprintId,
      setTasks,
      tasks,
      onTasksReload,
    });

  // Оборачиваем changeStatus: при экранных полях перехода показываем модалку
  const {
    transitionModal,
    handleStatusChangeWithModal,
    closeTransitionModal,
    handleTransitionSubmit,
  } = useTransitionModal({
    tasks,
    changeStatus: taskOperations.changeStatus,
    workflowScreens,
  });

  const handlePlanAssignees = useCallback(
    (assigneeIds: ReadonlySet<string>) => {
      const partsPerDay = getPartsPerDay();
      const draft = buildAssigneePlanDraft({
        assigneeIds,
        currentCell: getCurrentSprintCell(sprintStartDate, partsPerDay, sprintTimelineWorkingDays),
        developers: developersManagement.sortedDevelopers,
        existingPositions: positionsOmittingIds(taskPositions, positionsStore.draftTaskIds),
        tasks: allTasksForDrag,
        timelineCellCount: sprintTimelineWorkingDays * partsPerDay,
      });
      if (draft.length === 0) {
        toast(t('sidebar.tasksTab.planAssigneeEmpty'));
        return;
      }
      positionsStore.stagePlanDraft(draft);
    },
    [
      allTasksForDrag,
      developersManagement.sortedDevelopers,
      positionsStore,
      sprintStartDate,
      sprintTimelineWorkingDays,
      t,
      taskPositions,
    ]
  );

  const handleMoveToSprint = taskOperations.moveToSprint;
  const handleRemoveFromSprint = taskOperations.removeFromSprint;

  return {
    handleAccountWork,
    handleAutoAssignTasks,
    handleCloseSidebar,
    handleContextMenu,
    handleMoveToSprint,
    handleParentChange,
    handlePlanAssignees,
    handleRemoveFromSprint,
    handleReturnAllTasks,
    handleStatusChange: handleStatusChangeWithModal,
    handleTaskClick,
    handleTaskInfoFieldsSaved,
    handleToggleSidebar,
    transitionModal,
    closeTransitionModal,
    handleTransitionSubmit,
  };
}

