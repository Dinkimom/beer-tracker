'use client';

import type { Task } from '@/types';

import { useCallback, useState } from 'react';

import { findTaskById } from '@/features/sprint/hooks/useTaskOperations/utils/taskUtils';
import { getTaskTrackerDisplayKey } from '@/features/task/utils/taskUtils';
import { fetchScreenFields, getTransitionFields, type TransitionField } from '@/lib/beerTrackerApi';

import {
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
      const finalTargetStatusKey = targetStatusKey || '';

      const typeKey = task.type ?? 'task';
      const cached = resolveCachedTransitionFields(
        workflowScreens,
        typeKey,
        transitionId,
        finalTargetStatusKey || undefined
      );

      const trackerIssueKey = getTaskTrackerDisplayKey(task);

      const fetched = await loadTransitionModalFields({
        screenId,
        trackerIssueKey,
        transitionId,
      });
      const fields = pickTransitionFields(fetched, cached);

      if (shouldOpenTransitionFieldsModal(fields)) {
        setTransitionModal({
          taskId,
          transitionId,
          targetStatusKey: finalTargetStatusKey,
          targetStatusDisplay,
          fields,
          task,
        });
        return;
      }

      await changeStatus(taskId, transitionId, finalTargetStatusKey);
    },
    [tasks, changeStatus, workflowScreens]
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
