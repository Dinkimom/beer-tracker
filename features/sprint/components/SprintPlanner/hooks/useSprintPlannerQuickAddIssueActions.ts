import type { SprintBoard } from '@/features/sprint/model/SprintBoard';
import type { QuickAddCreateFields } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { Task } from '@/types';
import type { Dispatch, SetStateAction } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import toast from 'react-hot-toast';

import { getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { upsertSprintTaskInQueries } from '@/features/task/hooks/useTasks';

import { plannerDraftParentFromKey } from './applyQuickAddDraftFields';
import { submitConvertedSwimlaneComment } from './submitConvertedSwimlaneComment';
import { ensureExistingQuickAddFitsSprint, submitExistingQuickAddDraft } from './submitExistingQuickAddDraft';
import { submitQuickAddCreatedIssueDraft } from './submitQuickAddCreatedIssueDraft';

type CreatedIssueDraftInput = Parameters<typeof submitQuickAddCreatedIssueDraft>[0];

/** Черновик становится задачей трекера: новая задача (в т.ч. из сохранённой заметки) или существующая. */
interface UseSprintPlannerQuickAddIssueActionsParams
  extends Pick<
    CreatedIssueDraftInput,
    | 'featureDraftRowNamesById'
    | 'forDemoPlanner'
    | 'getQueueByBoardId'
    | 'onOpenCreatedTask'
    | 'persistPlannerDraftParent'
    | 'quickAddParentTasks'
  > {
  /** Спринт, задачи, заметки и позиции (с сохранением) — из модели доски. */
  board: SprintBoard;
  boardIdForPlannerData: number | null;
  setQuickAddSubmittingTaskId: Dispatch<SetStateAction<string | null>>;
  sprintTimelineWorkingDays: number;
  closeNoteComposer: () => void;
  onCommentDelete: (commentId: string, options?: { retargetLinksTo?: string }) => Promise<void> | void;
}

export function useSprintPlannerQuickAddIssueActions({
  board,
  boardIdForPlannerData,
  closeNoteComposer,
  featureDraftRowNamesById,
  forDemoPlanner,
  getQueueByBoardId,
  onCommentDelete,
  onOpenCreatedTask,
  persistPlannerDraftParent,
  quickAddParentTasks,
  setQuickAddSubmittingTaskId,
  sprintTimelineWorkingDays,
}: UseSprintPlannerQuickAddIssueActionsParams) {
  const { displayPositions: taskPositions, tasks, updateTasks: setTasks } = board;
  const { savePosition, setPositionsWithSave: setTaskPositions } = board.positions;
  const comments = board.comments.items;
  const selectedSprintId = board.sprintId;
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const handleSubmitQuickAddDraft = useCallback(
    async (taskId: string, draftTitle?: string, fields?: QuickAddCreateFields) => {
      if (!selectedSprintId || !boardIdForPlannerData) return;
      const savedCommentId = parseSwimlaneCommentTaskId(taskId);
      if (savedCommentId) {
        const savedComment = comments.find((comment) => comment.id === savedCommentId);
        if (!savedComment) {
          return;
        }
        try {
          setQuickAddSubmittingTaskId(taskId);
          const converted = await submitConvertedSwimlaneComment({
            comment: savedComment,
            createFailedMessage: t('planning.featurePlanner.epicOccupancy.createTaskFailed'),
            defaultQueue: getQueueByBoardId(boardIdForPlannerData),
            draftTitle,
            fallbackTitle: t('sprintPlanner.swimlane.quickAddPreviewTitle'),
            fields,
            missingAssigneeMessage: t('sprintPlanner.swimlane.quickAddMenu.assigneeRequired'),
            missingQueueMessage: t('task.mutations.tasksReloadFailed'),
            onCommentDelete,
            plannerParent: plannerDraftParentFromKey(
              fields?.parentKey || savedComment.parent?.key || savedComment.parent?.id,
              quickAddParentTasks,
              featureDraftRowNamesById
            ),
            savePosition: (position, isQa) => savePosition(position, isQa),
            selectedSprintId,
            setTaskPositions: (updater) => setTaskPositions(updater, { recordHistory: true }),
            setTasks,
          });
          if (!converted.ok) {
            toast.error(converted.error);
            return;
          }
          persistPlannerDraftParent(converted.issueKey, converted.task.parent);
          upsertSprintTaskInQueries(queryClient, selectedSprintId, converted.task);
          closeNoteComposer();
          onOpenCreatedTask(converted.task);
          toast.success(
            t('planning.featurePlanner.epicOccupancy.createTaskSuccess', {
              key: converted.issueKey,
            })
          );
        } finally {
          setQuickAddSubmittingTaskId((prev) => (prev === taskId ? null : prev));
        }
        return;
      }
      try {
        setQuickAddSubmittingTaskId(taskId);
        await submitQuickAddCreatedIssueDraft({
          boardIdForPlannerData,
          draftTitle,
          featureDraftRowNamesById,
          fields,
          forDemoPlanner,
          getQueueByBoardId,
          onOpenCreatedTask,
          persistPlannerDraftParent,
          queryClient,
          quickAddParentTasks,
          savePosition,
          selectedSprintId,
          setTaskPositions,
          setTasks,
          t,
          taskId,
          taskPositions,
          tasks,
        });
      } finally {
        setQuickAddSubmittingTaskId((prev) => (prev === taskId ? null : prev));
      }
    },
    [
      boardIdForPlannerData,
      closeNoteComposer,
      comments,
      featureDraftRowNamesById,
      forDemoPlanner,
      getQueueByBoardId,
      onCommentDelete,
      onOpenCreatedTask,
      persistPlannerDraftParent,
      queryClient,
      quickAddParentTasks,
      savePosition,
      selectedSprintId,
      setQuickAddSubmittingTaskId,
      setTaskPositions,
      setTasks,
      t,
      taskPositions,
      tasks,
    ]
  );

  const handleSelectExistingQuickAddDraft = useCallback(
    async (taskId: string, selectedTask: Task) => {
      if (!selectedSprintId) {
        return;
      }
      const draftTask = tasks.find((task) => task.id === taskId);
      const plannerParent = plannerDraftParentFromKey(
        draftTask?.parent?.key ?? draftTask?.parent?.id,
        quickAddParentTasks,
        featureDraftRowNamesById
      );
      const taskToAdd = plannerParent ? { ...selectedTask, parent: plannerParent } : selectedTask;
      const submitInput = {
        queryClient,
        savePosition,
        selectedSprintId,
        selectedTask: taskToAdd,
        setTaskPositions,
        setTasks,
        t,
        taskId,
        taskPositions,
        timelineTotalParts: sprintTimelineWorkingDays * getPartsPerDay(),
      };
      if (!ensureExistingQuickAddFitsSprint(submitInput)) {
        return;
      }
      try {
        setQuickAddSubmittingTaskId(taskId);
        await submitExistingQuickAddDraft(submitInput);
        persistPlannerDraftParent(taskToAdd.id, plannerParent);
      } finally {
        setQuickAddSubmittingTaskId((prev) => (prev === taskId ? null : prev));
      }
    },
    [
      featureDraftRowNamesById,
      persistPlannerDraftParent,
      queryClient,
      quickAddParentTasks,
      savePosition,
      selectedSprintId,
      setQuickAddSubmittingTaskId,
      setTaskPositions,
      setTasks,
      sprintTimelineWorkingDays,
      t,
      taskPositions,
      tasks,
    ]
  );

  return { handleSelectExistingQuickAddDraft, handleSubmitQuickAddDraft };
}
