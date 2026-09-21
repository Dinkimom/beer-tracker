import type { PositionHistoryOptions } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Comment, Task, TaskPosition } from '@/types';
import type { Dispatch, SetStateAction } from 'react';

import { useCallback } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { createSprintImageComment } from '@/lib/api/sprints';
import { useRootStore } from '@/lib/layers';

import { applyQuickAddDraftImageUrl } from './applyQuickAddDraftFields';
import { submitQuickAddImageDraft } from './submitQuickAddImageDraft';

interface UseSprintPlannerQuickAddImageActionsParams {
  forDemoPlanner: boolean;
  selectedSprintId: number | null;
  setTasks: Dispatch<SetStateAction<Task[]>>;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  onCommentCreate: (comment: Comment) => void;
  setQuickAddSubmittingTaskId: (taskId: string | null) => void;
  setTaskPositions: (
    positions:
      | Map<string, TaskPosition>
      | ((prev: Map<string, TaskPosition>) => Map<string, TaskPosition>),
    options?: PositionHistoryOptions
  ) => void;
}

export function useSprintPlannerQuickAddImageActions({
  forDemoPlanner,
  onCommentCreate,
  selectedSprintId,
  setQuickAddSubmittingTaskId,
  setTaskPositions,
  setTasks,
  taskPositions,
  tasks,
}: UseSprintPlannerQuickAddImageActionsParams) {
  const { t } = useI18n();
  const { sprintPlannerUi } = useRootStore();

  const handleQuickAddDraftImageUrlChange = useCallback(
    (taskId: string, url: string | undefined) => {
      setTasks((prev) => applyQuickAddDraftImageUrl(prev, taskId, url));
    },
    [setTasks]
  );

  const handleSubmitQuickAddImageDraft = useCallback(
    async (taskId: string, caption: string, imageUrl: string) => {
      setQuickAddSubmittingTaskId(taskId);
      try {
        const persistSprintId = forDemoPlanner ? null : selectedSprintId;
        const result = await submitQuickAddImageDraft({
          caption,
          cardRowUi: sprintPlannerUi,
          createImageComment:
            persistSprintId == null
              ? undefined
              : (fields) => createSprintImageComment(persistSprintId, fields),
          imageUrl,
          onCommentCreate,
          selectedSprintId: persistSprintId,
          setTaskPositions,
          setTasks,
          taskId,
          taskPositions,
          tasks,
        });
        if (result === 'created') {
          toast.success(t('sprintPlanner.swimlane.quickAddMenu.createImageSuccess'));
        }
        if (result === 'failed') {
          toast.error(t('sprintPlanner.swimlane.quickAddMenu.createImageFailed'));
        }
      } catch {
        toast.error(t('sprintPlanner.swimlane.quickAddMenu.createImageFailed'));
      } finally {
        setQuickAddSubmittingTaskId(null);
      }
    },
    [
      forDemoPlanner,
      onCommentCreate,
      selectedSprintId,
      setQuickAddSubmittingTaskId,
      setTaskPositions,
      setTasks,
      sprintPlannerUi,
      t,
      taskPositions,
      tasks,
    ]
  );

  return { handleQuickAddDraftImageUrlChange, handleSubmitQuickAddImageDraft };
}
