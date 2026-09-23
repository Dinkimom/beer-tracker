/**
 * Хук для операций изменения статуса задачи
 */

import type { Task } from '@/types';

import { useCallback } from 'react';
import toast from 'react-hot-toast';

import { mergeTransitionExtraFieldsIntoTask } from '@/features/sprint/utils/mergeTransitionFieldsIntoTask';
import { getTaskTrackerDisplayKey } from '@/features/task/utils/taskUtils';
import { usePlannerIntegrationRules } from '@/hooks/usePlannerIntegrationRules';
import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import {
  resolveStatusCategoryForStatusKey,
  sprintTaskCompletionRulesFromPlanner,
} from '@/lib/sprints/sprintTaskCompletion';
import { resolveStatusColorKey } from '@/lib/trackerIntegration/statusPalette';
import { mapStatus } from '@/utils/statusMapper';

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

export function useTaskStatusOperations({
  tasks,
  setTasks,
}: UseTaskStatusOperationsProps) {
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

      const { finalTargetStatusKey, transitionData } = await resolveStatusTransitionTargetKey(
        trackerIssueKey,
        transitionId,
        targetStatusKey
      );

      if (!finalTargetStatusKey) {
        console.error('Cannot determine target status for transition:', transitionId);
        return;
      }

      const isClosing = isClosingStatusTransition(finalTargetStatusKey, transitionId, transitionData);
      const fromTransition = mergeTransitionExtraFieldsIntoTask(extraFields);
      const completionRules = sprintTaskCompletionRulesFromPlanner(plannerRules);
      const nextCategory =
        resolveStatusCategoryForStatusKey(finalTargetStatusKey, completionRules) ??
        mapStatus(finalTargetStatusKey);
      const statusId = transitionData?.to?.id?.trim();
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
          ...(statusId ? { originalStatusId: statusId } : { originalStatusId: undefined }),
          status: nextCategory,
          statusColorKey: nextStatusColorKey,
          ...fromTransition,
        }))
      );

      try {
        await submitIssueStatusChange({
          extraFields,
          isClosing,
          taskId,
          targetStatusKey: finalTargetStatusKey,
          trackerIssueKey,
          transitionId,
        });

        toast.success('Статус изменен');
      } catch (error) {
        console.error('Error changing status:', error);
        setTasks((prev) =>
          updateTaskInArray(prev, taskId, () => ({ ...currentTask }))
        );
      }
    },
    [tasks, setTasks, plannerRules]
  );

  return {
    changeStatus,
  };
}
