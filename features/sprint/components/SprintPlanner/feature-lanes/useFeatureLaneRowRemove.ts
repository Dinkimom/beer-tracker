import type { Comment, Task } from '@/types';

import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

import { useConfirmDialog } from '@/components/ConfirmDialog';
import { useI18n } from '@/contexts/LanguageContext';
import { isFeatureLaneDraftRowId } from '@/features/swimlane/utils/featureSwimlaneRows';
import { moveSprintComments } from '@/lib/api/sprints';
import { formatSprintListItemDisplayName } from '@/utils/sprintDisplayName';

import { submitDeletedFeatureLaneDraft } from './submitDeletedFeatureLaneDraft';
import {
  submitMovedFeatureLane,
  submitRemovedFeatureLane,
} from './submitFeatureLaneRowSprintChange';

function ignoreCommentDelete(_commentId: string): void {
  return;
}

function ignoreAnnotationTask(_taskId: string): void {
  return;
}

function ignoreCommentsLeftSprint(_commentIds: string[]): void {
  return;
}

interface UseFeatureLaneRowRemoveInput {
  comments: Comment[];
  selectedSprintId: number | null;
  sprints: ReadonlyArray<{ id: number; name: string; quarter?: string | null }>;
  tasks: Task[];
  onClearTaskParent: (taskId: string) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentsLeftSprint?: (commentIds: string[]) => void;
  onDeleteAnnotationTask?: (taskId: string) => void;
  onMoveToSprint?: (taskId: string, sprintId: number, options?: { notify?: boolean }) => Promise<void>;
  onRemoveBoardRow: (rowId: string) => void;
  onRemoveDraftRow: (rowId: string) => void;
  onRemoveFromSprint?: (taskId: string, options?: { notify?: boolean }) => Promise<void>;
  onTransferDraftRow?: (rowId: string, targetSprintId: number) => Promise<void>;
}

export function useFeatureLaneRowRemove(input: UseFeatureLaneRowRemoveInput) {
  const { t } = useI18n();
  const { confirm, DialogComponent } = useConfirmDialog();
  const busyRef = useRef(false);
  const {
    comments,
    onClearTaskParent,
    onCommentDelete,
    onCommentsLeftSprint,
    onDeleteAnnotationTask,
    onMoveToSprint,
    onRemoveBoardRow,
    onRemoveDraftRow,
    onRemoveFromSprint,
    onTransferDraftRow,
    selectedSprintId,
    sprints,
    tasks,
  } = input;

  const moveCommentsToSprint = useCallback(
    async (commentIds: string[], targetSprintId: number) => {
      if (!selectedSprintId) {
        throw new Error(t('sprintPlanner.featureLanes.moveToSprintFailed'));
      }
      const moved = await moveSprintComments(selectedSprintId, targetSprintId, commentIds);
      if (!moved) {
        throw new Error(t('sprintPlanner.featureLanes.moveToSprintFailed'));
      }
    },
    [selectedSprintId, t]
  );

  const removeRow = useCallback(
    async (rowId: string) => {
      if (busyRef.current) {
        return;
      }
      if (isFeatureLaneDraftRowId(rowId)) {
        const confirmed = await confirm(t('sprintPlanner.featureLanes.deleteRowConfirm'), {
          cancelText: t('common.cancel'),
          confirmText: t('common.delete'),
          title: t('sprintPlanner.featureLanes.deleteRowTitle'),
          variant: 'destructive',
        });
        if (!confirmed) {
          return;
        }
        busyRef.current = true;
        try {
          const result = await submitDeletedFeatureLaneDraft({
            comments,
            onClearTaskParent,
            onCommentDelete: onCommentDelete ?? ignoreCommentDelete,
            onDeleteAnnotationTask: onDeleteAnnotationTask ?? ignoreAnnotationTask,
            onRemoveDraftRow,
            parentUpdateFailedMessage: t('sprintPlanner.featureLanes.deleteFailed'),
            rowId,
            tasks,
          });
          if (!result.ok) {
            toast.error(result.error);
          }
        } finally {
          busyRef.current = false;
        }
        return;
      }
      if (!onRemoveFromSprint) {
        return;
      }
      const confirmed = await confirm(t('sprintPlanner.featureLanes.removeFromSprintConfirm'), {
        cancelText: t('common.cancel'),
        confirmText: t('sprintPlanner.contextMenu.removeFromSprint'),
        title: t('sprintPlanner.featureLanes.removeFromSprintTitle'),
        variant: 'destructive',
      });
      if (!confirmed) {
        return;
      }
      busyRef.current = true;
      try {
        const result = await submitRemovedFeatureLane({
          comments,
          failedMessage: t('sprintPlanner.featureLanes.removeFromSprintFailed'),
          onCommentDelete: onCommentDelete ?? ignoreCommentDelete,
          onDeleteAnnotationTask: onDeleteAnnotationTask ?? ignoreAnnotationTask,
          onRemoveBoardRow,
          onRemoveFromSprint: (taskId) => onRemoveFromSprint(taskId, { notify: false }),
          rowId,
          sprintId: selectedSprintId,
          tasks,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(t('sprintPlanner.featureLanes.removeFromSprintSuccess'));
      } finally {
        busyRef.current = false;
      }
    },
    [
      comments,
      confirm,
      onClearTaskParent,
      onCommentDelete,
      onDeleteAnnotationTask,
      onRemoveBoardRow,
      onRemoveDraftRow,
      onRemoveFromSprint,
      selectedSprintId,
      t,
      tasks,
    ]
  );

  const moveRow = useCallback(
    async (rowId: string, sprintId: number) => {
      const isDraftRow = isFeatureLaneDraftRowId(rowId);
      if (busyRef.current) {
        return;
      }
      if (isDraftRow ? !onTransferDraftRow : !onMoveToSprint) {
        return;
      }
      const targetSprint = sprints.find((sprint) => sprint.id === sprintId);
      const sprintName = targetSprint
        ? formatSprintListItemDisplayName(targetSprint)
        : String(sprintId);
      const confirmed = await confirm(
        t('sprintPlanner.featureLanes.moveToSprintConfirm', { name: sprintName }),
        {
          cancelText: t('common.cancel'),
          confirmText: t('common.confirm'),
          title: t('sprintPlanner.featureLanes.moveToSprintTitle'),
        }
      );
      if (!confirmed) {
        return;
      }
      busyRef.current = true;
      try {
        const result = await submitMovedFeatureLane({
          comments,
          failedMessage: t('sprintPlanner.featureLanes.moveToSprintFailed'),
          onCommentsLeftSprint: onCommentsLeftSprint ?? ignoreCommentsLeftSprint,
          onMoveComments: moveCommentsToSprint,
          onMoveToSprint: (taskId, nextSprintId) =>
            onMoveToSprint
              ? onMoveToSprint(taskId, nextSprintId, { notify: false })
              : Promise.resolve(),
          onRemoveBoardRow,
          onTransferDraftRow,
          rowId,
          sprintId: selectedSprintId,
          targetSprintId: sprintId,
          tasks,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(t('sprintPlanner.featureLanes.moveToSprintSuccess', { name: sprintName }));
      } finally {
        busyRef.current = false;
      }
    },
    [
      comments,
      confirm,
      moveCommentsToSprint,
      onCommentsLeftSprint,
      onMoveToSprint,
      onRemoveBoardRow,
      onTransferDraftRow,
      selectedSprintId,
      sprints,
      t,
      tasks,
    ]
  );

  return { DialogComponent, moveRow, removeRow };
}
