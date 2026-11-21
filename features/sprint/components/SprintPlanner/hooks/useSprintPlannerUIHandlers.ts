/**
 * Хук для UI обработчиков в SprintPlanner (контекстное меню, сайдбар, автоматическая расстановка)
 */

import type { DevelopersManagement } from '@/features/sprint/hooks/useDevelopersManagement';
import type { SprintBoard } from '@/features/sprint/model/SprintBoard';
import type { TransitionField } from '@/lib/beerTrackerApi';
import type { Task } from '@/types';
import type { MutableRefObject } from 'react';

import { useCallback } from 'react';
import toast from 'react-hot-toast';

import { getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { useHolidayDays } from '@/features/sprint/hooks/useHolidayDays';
import {
  buildAssigneePlanDraft,
  positionsOmittingIds,
} from '@/features/task/utils/planAssigneeDraft';
import { getCurrentSprintCell } from '@/utils/dateUtils';

import { useSprintPlannerAutoAssignHandlers } from './useSprintPlannerUIHandlers/hooks/useSprintPlannerAutoAssignHandlers';
import { useSprintPlannerContextMenuHandlers } from './useSprintPlannerUIHandlers/hooks/useSprintPlannerContextMenuHandlers';
import { useSprintPlannerSidebarHandlers } from './useSprintPlannerUIHandlers/hooks/useSprintPlannerSidebarHandlers';
import { useSprintPlannerTaskInteractionHandlers } from './useSprintPlannerUIHandlers/hooks/useSprintPlannerTaskInteractionHandlers';
import { useTransitionModal } from './useTransitionModal';

interface UseSprintPlannerUIHandlersProps {
  allTasksForDrag: Task[];
  /** Задачи, позиции и их правка, связи — из модели доски. */
  board: SprintBoard;
  developersManagement: DevelopersManagement;
  resetDragStateRef: MutableRefObject<(() => void) | null>;
  selectedSprintId: number | null;
  sprintStartDate: Date;
  sprintTimelineWorkingDays: number;
  taskOperations: {
    changeStatus: (taskId: string, transitionId: string, targetStatusKey?: string, extraFields?: Record<string, unknown>) => Promise<void>;
    moveToSprint: (taskId: string, sprintId: number) => Promise<void>;
    removeFromSprint: (taskId: string) => Promise<void>;
  };
  tasksMap: Map<string, Task>;
  /** Экранные поля переходов для очереди (typeKey -> transitionId -> fields) */
  workflowScreens?: Record<string, Record<string, TransitionField[]>>;
  confirm: (message: string, options?: {
    title?: string;
    variant?: 'default' | 'destructive';
  }) => Promise<boolean>;
  debouncedUpdateXarrow: () => void;
  onTasksReload?: () => void;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

export function useSprintPlannerUIHandlers({
  allTasksForDrag,
  board,
  developersManagement,
  resetDragStateRef,
  selectedSprintId,
  setSidebarOpen,
  setTasks,
  sprintStartDate,
  sprintTimelineWorkingDays,
  taskOperations,
  tasksMap,
  confirm,
  debouncedUpdateXarrow,
  onTasksReload,
  workflowScreens = {},
}: UseSprintPlannerUIHandlersProps) {
  const { t } = useI18n();
  const { displayPositions: taskPositions, positions: positionsStore, tasks } = board;
  // Те же праздники, что в шапке свимлейна: расстановка их пропускает
  const holidayDayIndices = useHolidayDays(sprintStartDate, sprintTimelineWorkingDays);
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
    board,
    developersManagement,
    holidayDayIndices,
    resetDragStateRef,
    selectedSprintId,
    sprintStartDate,
    sprintTimelineWorkingDays,
    tasksMap,
    confirm,
    debouncedUpdateXarrow,
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
        holidayDayIndices,
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
      holidayDayIndices,
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

