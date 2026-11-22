import type { SprintBoard } from '@/features/sprint/model/SprintBoard';
import type { Comment } from '@/types';

import { useCallback } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { createSprintImageComment } from '@/lib/api/sprints';
import { useRootStore } from '@/lib/layers';

import { applyQuickAddDraftImageUrl } from './applyQuickAddDraftFields';
import { submitQuickAddImageDraft } from './submitQuickAddImageDraft';

interface UseSprintPlannerQuickAddImageActionsParams {
  /** Спринт, задачи и позиции (с сохранением) — из модели доски. */
  board: SprintBoard;
  forDemoPlanner: boolean;
  onCommentCreate: (comment: Comment) => void;
  setQuickAddSubmittingTaskId: (taskId: string | null) => void;
}

export function useSprintPlannerQuickAddImageActions({
  board,
  forDemoPlanner,
  onCommentCreate,
  setQuickAddSubmittingTaskId,
}: UseSprintPlannerQuickAddImageActionsParams) {
  const { displayPositions: taskPositions, tasks, updateTasks: setTasks } = board;
  const { setPositionsWithSave: setTaskPositions } = board.positions;
  const selectedSprintId = board.sprintId;
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
          cardRowUi: sprintPlannerUi.cards,
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
