/**
 * Хук для управления всеми обработчиками SprintPlanner
 * Композирует специализированные хуки для разных типов обработчиков
 */

import type { UseSprintPlannerHandlersProps } from './useSprintPlannerHandlers.types';
import type { Comment, Task } from '@/types';

import { useCallback } from 'react';

import { WORKING_DAYS, getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  playStickyNoteExit,
  shouldAnimateStickyNoteDelete,
} from '@/features/comments/utils/stickyNoteExit';
import { toSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { playTaskBoardExit } from '@/features/task/utils/taskBoardExit';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { parseTrackerOverlayLinkId } from '@/lib/planner/trackerLinkOverlay';
import { DELAYS } from '@/utils/constants';

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
  const { allTasksForDrag, filteredTaskLinks, filteredTaskPositions, tasksMap } = boardView;
  const { sprintStartDate, sprintTimelineWorkingDays } = timeline;
  const { t } = useI18n();
  const taskHandlers = useSprintPlannerTaskHandlers({
    board,
    qaTaskManagement,
    onRequestQaEngineerPicker,
    sprintTimelineWorkingDays,
    debouncedUpdateXarrow,
  });

  const { data: currentUser } = useCurrentUser();
  const authorDisplay = currentUser?.display;
  // Заметки: правила — у модели (`board.notes`); здесь только автор и анимация ухода с доски.
  const handleCommentCreate = useCallback(
    (comment: Comment) => board.notes.create(comment, authorDisplay),
    [authorDisplay, board]
  );
  const handleCommentDelete = useCallback(
    (id: string, options?: { retargetLinksTo?: string }) => {
      const remove = () => board.notes.remove(id, options);
      const comment = board.comments.items.find((item) => item.id === id);
      if (!shouldAnimateStickyNoteDelete(comment, options?.retargetLinksTo)) {
        return remove();
      }
      playStickyNoteExit(toSwimlaneCommentTaskId(id), remove);
      return undefined;
    },
    [board]
  );

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
      // Связь из трекера удаляется в трекере; связь доски — правило модели.
      if (parseTrackerOverlayLinkId(linkId)) {
        const link = filteredTaskLinks.find((item) => item.id === linkId);
        if (link && deleteTrackerOverlayLink) {
          deleteTrackerOverlayLink(link).catch((error) => {
            console.error('Error deleting tracker link:', error);
          });
        }
      } else {
        board.removeLink(linkId);
      }
      debouncedUpdateXarrow();
    },
    [board, deleteTrackerOverlayLink, debouncedUpdateXarrow, filteredTaskLinks]
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

  // Добавить в первое свободное место строки исполнителя (кнопка в сайдбаре) — правило у `board.plan`.
  const handleAutoAddToSwimlane = useCallback(
    (task: Task) => {
      const placed = board.plan.autoAdd(task, {
        developers: developersManagement.sortedDevelopers,
        positions: filteredTaskPositions,
        timelineTotalCells: (sprintTimelineWorkingDays ?? WORKING_DAYS) * getPartsPerDay(),
      });
      if (placed) {
        setTimeout(() => debouncedUpdateXarrow(), DELAYS.IMMEDIATE);
      }
    },
    [board, debouncedUpdateXarrow, developersManagement.sortedDevelopers, filteredTaskPositions, sprintTimelineWorkingDays]
  );

  // Удалить из плана — убрать позицию и связи, задача остаётся в спринте
  const handleRemoveFromPlan = useCallback(
    (taskId: string) => {
      // Карточка сначала «снимается» с доски, позиция и связи уходят после анимации.
      void playTaskBoardExit([taskId], 'plan', () => {
        board.plan.unplace(taskId);
        board.removeTaskLinks(taskId);
        debouncedUpdateXarrow();
      });
    },
    [board, debouncedUpdateXarrow]
  );

  return {
    // UI handlers
    ...uiHandlers,
    transitionModal: uiHandlers.transitionModal,
    closeTransitionModal: uiHandlers.closeTransitionModal,
    handleTransitionSubmit: uiHandlers.handleTransitionSubmit,
    // Task handlers
    ...taskHandlers,
    // Заметки: создание с автором и удаление с анимацией; остальное — `board.notes`
    handleCommentCreate,
    handleCommentDelete,
    // Link handlers
    handleDeleteLink,
    handleAutoAddToSwimlane,
    handleRemoveFromPlan,
  };
}

/** Обработчики доски одним объектом — секции берут его целиком, а не по полю. */
export type SprintPlannerHandlers = ReturnType<typeof useSprintPlannerHandlers>;
