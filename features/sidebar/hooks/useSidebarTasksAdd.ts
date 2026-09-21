import type { FeatureLaneConvertNewFields } from '@/features/task/components/TaskCard/FeatureLaneCardUiContext';
import type { Task } from '@/types';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import {
  submitSidebarCreatedSprintTask,
  submitSidebarExistingSprintTask,
} from '@/features/sidebar/components/tabs/TasksTab/submitSidebarSprintTask';

export function useSidebarTasksAdd(input: {
  selectedSprintId: number | null | undefined;
  onSprintTaskUpserted?: (task: Task) => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { onSprintTaskUpserted, selectedSprintId } = input;

  const attachExisting = useCallback(
    async (selectedTask: Task): Promise<boolean> => {
      if (!selectedSprintId || !onSprintTaskUpserted) {
        return false;
      }
      setIsSubmitting(true);
      try {
        const result = await submitSidebarExistingSprintTask({
          createFailedMessage: t('planning.featurePlanner.epicOccupancy.createTaskFailed'),
          onUpserted: onSprintTaskUpserted,
          queryClient,
          selectedSprintId,
          selectedTask,
        });
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        toast.success(
          t('sprintPlanner.swimlane.quickAddMenu.addExistingSuccess', { key: result.issueKey })
        );
        return true;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSprintTaskUpserted, queryClient, selectedSprintId, t]
  );

  const createNew = useCallback(
    async (fields: FeatureLaneConvertNewFields): Promise<boolean> => {
      if (!selectedSprintId || !onSprintTaskUpserted) {
        return false;
      }
      setIsSubmitting(true);
      try {
        const result = await submitSidebarCreatedSprintTask({
          createFailedMessage: t('planning.featurePlanner.epicOccupancy.createTaskFailed'),
          issueType: fields.issueType,
          missingQueueMessage: t('task.mutations.tasksReloadFailed'),
          onUpserted: onSprintTaskUpserted,
          queryClient,
          queueKey: fields.queueKey,
          selectedSprintId,
          summary: fields.summary,
        });
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        toast.success(
          t('planning.featurePlanner.epicOccupancy.createTaskSuccess', { key: result.issueKey })
        );
        return true;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSprintTaskUpserted, queryClient, selectedSprintId, t]
  );

  return {
    attachExisting,
    createNew,
    isSubmitting,
  };
}
