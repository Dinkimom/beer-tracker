'use client';

import type { Task } from '@/types';

import { useCallback, useState } from 'react';

import { findTaskById } from '@/features/sprint/hooks/useTaskOperations/utils/taskUtils';
import {
  clearTaskStatusTransition,
  markTaskStatusTransitionPending,
} from '@/features/task/utils/taskStatusTransitionFeedback';
import { getTaskTrackerDisplayKey } from '@/features/task/utils/taskUtils';
import {
  fetchScreenFields,
  getRecentIssueTransitions,
  getTransitionFields,
  type TransitionField,
} from '@/lib/beerTrackerApi';
import {
  isTransitionRequiresFieldsError,
  transitionFieldsFromErrorMessages,
} from '@/lib/issues/transitionRequiresFields';

import {
  mergeTransitionFieldsById,
  pickTransitionFields,
  resolveCachedTransitionFields,
  shouldOpenTransitionFieldsModal,
  type WorkflowScreens,
} from './useTransitionModalHelpers';

function loadTransitionModalFields(args: {
  screenId?: string;
  trackerIssueKey: string;
  transitionId: string;
}): Promise<TransitionField[]> {
  // Prefer issue-scoped fields: attaches workflow resolutions for schemaType=resolution.
  if (args.trackerIssueKey && args.transitionId) {
    return getTransitionFields(args.trackerIssueKey, args.transitionId);
  }
  if (args.screenId) {
    return fetchScreenFields(args.screenId);
  }
  return Promise.resolve([]);
}

interface TransitionModalState {
  fields: TransitionField[];
  targetStatusDisplay?: string;
  targetStatusKey: string;
  task?: Task;
  taskId: string;
  transitionId: string;
}

interface UseTransitionModalProps {
  tasks: Task[];
  /** Экранные поля переходов для очереди (если есть — показываем модалку локально) */
  workflowScreens?: WorkflowScreens;
  changeStatus: (taskId: string, transitionId: string, targetStatusKey?: string, extraFields?: Record<string, unknown>) => Promise<void>;
}

export function useTransitionModal({
  tasks,
  changeStatus,
  workflowScreens = {},
}: UseTransitionModalProps) {
  const [transitionModal, setTransitionModal] = useState<TransitionModalState | null>(null);

  const closeTransitionModal = useCallback(() => {
    setTransitionModal(null);
  }, []);

  const openTransitionModal = useCallback(
    (args: {
      fields: TransitionField[];
      targetStatusDisplay?: string;
      targetStatusKey: string;
      task: Task;
      taskId: string;
      transitionId: string;
    }) => {
      clearTaskStatusTransition(args.task.id);
      setTransitionModal(args);
    },
    []
  );

  const handleStatusChangeWithModal = useCallback(
    async (
      taskId: string,
      transitionId: string,
      targetStatusKey?: string,
      targetStatusDisplay?: string,
      screenId?: string
    ) => {
      const task = findTaskById(tasks, taskId);
      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }
      // Карточка откликается сразу, пока грузятся поля перехода.
      markTaskStatusTransitionPending(task.id);
      const finalTargetStatusKey = targetStatusKey || '';

      const typeKey = task.type ?? 'task';
      const cached = resolveCachedTransitionFields(
        workflowScreens,
        typeKey,
        transitionId,
        finalTargetStatusKey || undefined
      );

      const trackerIssueKey = getTaskTrackerDisplayKey(task);
      // changeStatus ниже ждёт список переходов — грузим его параллельно с полями перехода.
      void getRecentIssueTransitions(trackerIssueKey);

      let fetched: TransitionField[];
      try {
        fetched = await loadTransitionModalFields({ screenId, trackerIssueKey, transitionId });
      } catch (error) {
        clearTaskStatusTransition(task.id);
        throw error;
      }
      const fields = pickTransitionFields(fetched, cached);

      if (shouldOpenTransitionFieldsModal(fields)) {
        openTransitionModal({
          taskId,
          transitionId,
          targetStatusKey: finalTargetStatusKey,
          targetStatusDisplay,
          fields,
          task,
        });
        return;
      }

      try {
        await changeStatus(taskId, transitionId, finalTargetStatusKey);
      } catch (error) {
        if (!isTransitionRequiresFieldsError(error)) {
          throw error;
        }
        // Tracker can require fields (e.g. comment) even when the transition has no screen.
        const fromError = transitionFieldsFromErrorMessages(error.errorMessages);
        const recovered = mergeTransitionFieldsById(fields, fromError);
        if (!shouldOpenTransitionFieldsModal(recovered)) {
          clearTaskStatusTransition(task.id);
          throw error;
        }
        openTransitionModal({
          taskId,
          transitionId,
          targetStatusKey: finalTargetStatusKey,
          targetStatusDisplay,
          fields: recovered,
          task,
        });
      }
    },
    [tasks, changeStatus, workflowScreens, openTransitionModal]
  );

  const handleTransitionSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      if (!transitionModal) return;

      const { taskId, transitionId, targetStatusKey } = transitionModal;
      await changeStatus(taskId, transitionId, targetStatusKey, values);
      closeTransitionModal();
    },
    [transitionModal, changeStatus, closeTransitionModal]
  );

  return {
    transitionModal,
    handleStatusChangeWithModal,
    closeTransitionModal,
    handleTransitionSubmit,
  };
}
