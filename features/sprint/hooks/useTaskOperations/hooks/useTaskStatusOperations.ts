/**
 * Хук для операций изменения статуса задачи
 */

import type { Task } from '@/types';

import { useCallback } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { mergeTransitionExtraFieldsIntoTask } from '@/features/sprint/utils/mergeTransitionFieldsIntoTask';
import {
  clearTaskStatusTransition,
  markTaskStatusTransitionPending,
  settleTaskStatusTransition,
} from '@/features/task/utils/taskStatusTransitionFeedback';
import { getTaskTrackerDisplayKey } from '@/features/task/utils/taskUtils';
import { usePlannerIntegrationRules } from '@/hooks/usePlannerIntegrationRules';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import { isTransitionRequiresFieldsError } from '@/lib/issues/transitionRequiresFields';
import { statusTypeKeyForStatus } from '@/lib/sprints/sprintTaskCompletion';
import { resolvePlannerStatusCategory } from '@/lib/trackerIntegration/resolveStatus';
import { resolveStatusColorKey } from '@/lib/trackerIntegration/statusPalette';
import { mapStatus, trackerStatusDisplayName } from '@/utils/statusMapper';

import { findTaskById, updateTaskInArray } from '../utils/taskUtils';

import {
  isClosingStatusTransition,
  resolveStatusTransitionTargetKey,
  submitIssueStatusChange,
} from './useTaskStatusOperationsHelpers';

interface UseTaskStatusOperationsProps {
  tasks: Task[];
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

/** Резолюция, выбранная на экране перехода (строка или `{ key }`). */
function transitionResolutionKey(extraFields: Record<string, unknown> | undefined): string | undefined {
  const raw = extraFields?.resolution;
  if (typeof raw === 'string') return raw.trim() || undefined;
  if (raw && typeof raw === 'object' && typeof (raw as { key?: unknown }).key === 'string') {
    return ((raw as { key: string }).key).trim() || undefined;
  }
  return undefined;
}

export function useTaskStatusOperations({
  tasks,
  setTasks,
}: UseTaskStatusOperationsProps) {
  const { t } = useI18n();
  const { activeOrganizationId } = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const { data: plannerRules } = usePlannerIntegrationRules(activeOrganizationId);

  const changeStatus = useCallback(
    async (
      taskId: string,
      transitionId: string,
      targetStatusKey?: string,
      extraFields?: Record<string, unknown>
    ) => {
      const currentTask = findTaskById(tasks, taskId);
      if (!currentTask) {
        console.error('Task not found:', taskId);
        return;
      }

      const trackerIssueKey = getTaskTrackerDisplayKey(currentTask);
      markTaskStatusTransitionPending(currentTask.id);

      const { finalTargetStatusKey, transitionData } = await resolveStatusTransitionTargetKey(
        trackerIssueKey,
        transitionId,
        targetStatusKey
      );

      if (!finalTargetStatusKey) {
        console.error('Cannot determine target status for transition:', transitionId);
        settleTaskStatusTransition(currentTask.id, 'failed');
        toast.error(t('sprint.taskToast.statusChangeFailed', { key: trackerIssueKey }));
        return;
      }

      const isClosing = isClosingStatusTransition(finalTargetStatusKey, transitionId, transitionData);
      const fromTransition = mergeTransitionExtraFieldsIntoTask(extraFields);
      const statusId = transitionData?.to?.id?.trim();
      const nextStatusTypeKey = (
        transitionData?.to?.statusTypeKey ??
        statusTypeKeyForStatus(finalTargetStatusKey, plannerRules?.completion) ??
        (statusId ? statusTypeKeyForStatus(statusId, plannerRules?.completion) : undefined)
      )?.toLowerCase();
      const nextCategory =
        resolvePlannerStatusCategory(finalTargetStatusKey, nextStatusTypeKey, plannerRules) ??
        mapStatus(finalTargetStatusKey);
      const nextStatusDisplay = trackerStatusDisplayName(
        transitionData?.to?.display,
        finalTargetStatusKey
      );
      const alternateKeys =
        statusId && statusId !== finalTargetStatusKey ? [statusId] : undefined;
      const nextStatusColorKey = resolveStatusColorKey(
        finalTargetStatusKey,
        transitionData?.to?.statusTypeKey,
        plannerRules?.statusOverridesByStatusKey,
        alternateKeys
      );

      setTasks((prev) =>
        updateTaskInArray(prev, taskId, (task) => ({
          ...task,
          originalStatus: finalTargetStatusKey!,
          originalStatusDisplay: nextStatusDisplay,
          ...(statusId ? { originalStatusId: statusId } : { originalStatusId: undefined }),
          status: nextCategory,
          statusColorKey: nextStatusColorKey,
          statusTypeKey: nextStatusTypeKey,
          resolution:
            nextStatusTypeKey === 'done'
              ? transitionResolutionKey(extraFields) ?? (isClosing ? 'fixed' : task.resolution)
              : undefined,
          ...fromTransition,
        }))
      );

      try {
        await submitIssueStatusChange({
          extraFields,
          isClosing,
          targetStatusDisplay: nextStatusDisplay,
          taskId,
          targetStatusKey: finalTargetStatusKey,
          trackerIssueKey,
          transitionId,
        });

        // Отклик — перекраска карточки с подсветкой, без тоста.
        settleTaskStatusTransition(currentTask.id, 'applied');
      } catch (error) {
        console.error('Error changing status:', error);
        setTasks((prev) =>
          updateTaskInArray(prev, taskId, () => ({ ...currentTask }))
        );
        // Let the transition modal recover (open form for Tracker-required fields).
        if (isTransitionRequiresFieldsError(error)) {
          clearTaskStatusTransition(currentTask.id);
          throw error;
        }
        settleTaskStatusTransition(currentTask.id, 'failed');
        toast.error(t('sprint.taskToast.statusChangeFailed', { key: trackerIssueKey }));
      }
    },
    [tasks, setTasks, plannerRules, t]
  );

  return {
    changeStatus,
  };
}
