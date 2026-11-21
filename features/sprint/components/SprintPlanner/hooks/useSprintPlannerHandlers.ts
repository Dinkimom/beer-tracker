/**
 * Хук для управления всеми обработчиками SprintPlanner
 * Композирует специализированные хуки для разных типов обработчиков
 */

import type { UseSprintPlannerHandlersProps } from './useSprintPlannerHandlers.types';

import { useCallback } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { playTaskBoardExit } from '@/features/task/utils/taskBoardExit';
import { parseTrackerOverlayLinkId } from '@/lib/planner/trackerLinkOverlay';

import { useSprintPlannerCommentHandlers } from './useSprintPlannerCommentHandlers';
import { useSprintPlannerTaskHandlers } from './useSprintPlannerTaskHandlers';
import { useSprintPlannerUIHandlers } from './useSprintPlannerUIHandlers';

export function useSprintPlannerHandlers({
  boardView,
  state,
  timeline,
  selectedSprintId,
  setSidebarOpen,
  confirm,
  debouncedUpdateXarrow,
  developersManagement,
  resetDragStateRef,
  qaTaskManagement,
  taskOperations,
  deleteTrackerOverlayLink,
  onRequestQaEngineerPicker,
  onTasksReload,
  workflowScreens,
}: UseSprintPlannerHandlersProps) {
  const { board, setTasks } = state;
  // Связи — из модели доски.
  const { delete: deleteLink, setWithSave: setTaskLinks } = board.links;
  const { allTasksForDrag, filteredTaskLinks, filteredTaskPositions, taskLinks, tasksMap } = boardView;
  const { sprintStartDate, sprintTimelineWorkingDays } = timeline;
  const { t } = useI18n();
  const taskHandlers = useSprintPlannerTaskHandlers({
    board,
    developers: developersManagement.sortedDevelopers,
    filteredTaskPositions,
    qaTaskManagement,
    onRequestQaEngineerPicker,
    selectedSprintId,
    sprintTimelineWorkingDays,
    setTasks,
    tasksMap,
    debouncedUpdateXarrow,
  });

  const commentHandlers = useSprintPlannerCommentHandlers({ board, selectedSprintId });

  const uiHandlers = useSprintPlannerUIHandlers({
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
    workflowScreens,
  });

  const applyDeleteLink = useCallback(
    (linkId: string) => {
      const trackerLinkId = parseTrackerOverlayLinkId(linkId);
      const link =
        taskLinks.find((item) => item.id === linkId) ??
        filteredTaskLinks.find((item) => item.id === linkId);

      setTaskLinks((prev) => prev.filter((item) => item.id !== linkId));

      if (trackerLinkId) {
        if (link && deleteTrackerOverlayLink) {
          deleteTrackerOverlayLink(link).catch((error) => {
            console.error('Error deleting tracker link:', error);
          });
        }
        debouncedUpdateXarrow();
        return;
      }

      if (selectedSprintId) {
        deleteLink(linkId).catch((error) => {
          console.error('Error deleting link:', error);
        });
      }
      debouncedUpdateXarrow();
    },
    [
      setTaskLinks,
      selectedSprintId,
      deleteLink,
      deleteTrackerOverlayLink,
      debouncedUpdateXarrow,
      taskLinks,
      filteredTaskLinks,
    ]
  );

  // Обработчик удаления связи (с подтверждением)
  const handleDeleteLink = useCallback(
    (linkId: string) => {
      confirm(t('sprintPlanner.links.removeConfirm'), {
        title: t('sprintPlanner.links.removeTitle'),
        confirmText: t('sprintPlanner.links.removeConfirmAction'),
        cancelText: t('sprintPlanner.links.removeCancelAction'),
        variant: 'destructive',
      }).then((ok) => {
        if (!ok) return;
        applyDeleteLink(linkId);
      });
    },
    [confirm, applyDeleteLink, t]
  );

  // Обработчик удаления позиции задачи (оптимистично: сначала локально, затем запрос)
  const handlePositionDelete = useCallback(
    (taskId: string) => {
      taskHandlers.handlePositionDelete(taskId);
    },
    [taskHandlers]
  );

  // Удалить из плана — убрать позицию и связи, задача остаётся в спринте
  const handleRemoveFromPlan = useCallback(
    (taskId: string) => {
      // Карточка сначала «снимается» с доски, позиция и связи уходят после анимации.
      void playTaskBoardExit([taskId], 'plan', () => {
        taskHandlers.handlePositionDelete(taskId);
        const linksToDelete = filteredTaskLinks.filter(
          (link) => link.fromTaskId === taskId || link.toTaskId === taskId
        );
        setTaskLinks((prev) =>
          prev.filter((link) => link.fromTaskId !== taskId && link.toTaskId !== taskId)
        );
        if (selectedSprintId) {
          linksToDelete.forEach((link) => {
            deleteLink(link.id).catch((error) => {
              console.error('Error deleting link:', error);
            });
          });
        }
        debouncedUpdateXarrow();
      });
    },
    [
      taskHandlers,
      filteredTaskLinks,
      setTaskLinks,
      selectedSprintId,
      deleteLink,
      debouncedUpdateXarrow,
    ]
  );

  return {
    // UI handlers
    ...uiHandlers,
    transitionModal: uiHandlers.transitionModal,
    closeTransitionModal: uiHandlers.closeTransitionModal,
    handleTransitionSubmit: uiHandlers.handleTransitionSubmit,
    // Task handlers
    ...taskHandlers,
    // Comment handlers
    ...commentHandlers,
    // Link handlers
    handleDeleteLink,
    handlePositionDelete,
    handleRemoveFromPlan,
  };
}

/** Обработчики доски одним объектом — секции берут его целиком, а не по полю. */
export type SprintPlannerHandlers = ReturnType<typeof useSprintPlannerHandlers>;
