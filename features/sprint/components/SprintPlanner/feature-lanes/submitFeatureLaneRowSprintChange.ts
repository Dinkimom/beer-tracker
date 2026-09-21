import type { Comment, Task } from '@/types';

import {
  isFeatureLaneActionableRowId,
  isFeatureLaneDraftRowId,
} from '@/features/swimlane/utils/featureSwimlaneRows';

import {
  collectFeatureLaneRowComments,
  collectFeatureLaneRowWorkTasks,
  deleteFeatureLaneRowAnnotations,
} from './featureLaneRowItems';

interface FeatureLaneRowSprintChangeInput {
  comments: Comment[];
  failedMessage: string;
  rowId: string;
  sprintId: number | null;
  tasks: Task[];
  onRemoveBoardRow: (rowId: string) => void;
}

type FeatureLaneRowSprintChangeResult = { error: string; ok: false } | { ok: true };

function canMoveFeatureLane(rowId: string, sprintId: number | null): sprintId is number {
  return sprintId != null && isFeatureLaneActionableRowId(rowId);
}

function canChangeTrackerFeatureLane(rowId: string, sprintId: number | null): sprintId is number {
  return canMoveFeatureLane(rowId, sprintId) && !isFeatureLaneDraftRowId(rowId);
}

async function changeTrackerWorkTasks(
  input: Pick<FeatureLaneRowSprintChangeInput, 'failedMessage' | 'rowId' | 'tasks'> & {
    onDeleteLocalWorkTask?: (taskId: string) => void;
  },
  changeWorkTask: (taskId: string) => Promise<void>
): Promise<string | null> {
  try {
    for (const task of collectFeatureLaneRowWorkTasks(input.rowId, input.tasks)) {
      if (task.isLocalTask === true) {
        input.onDeleteLocalWorkTask?.(task.id);
        continue;
      }
      await changeWorkTask(task.id);
    }
  } catch {
    return input.failedMessage;
  }
  return null;
}

/** Убирает фичу из спринта: заметки/фото/схемы удаляет, задачи Трекера отправляет в бэклог. */
export async function submitRemovedFeatureLane(
  input: FeatureLaneRowSprintChangeInput & {
    onCommentDelete: (commentId: string) => void;
    onDeleteAnnotationTask: (taskId: string) => void;
    onRemoveFromSprint: (taskId: string) => Promise<void>;
  }
): Promise<FeatureLaneRowSprintChangeResult> {
  if (!canChangeTrackerFeatureLane(input.rowId, input.sprintId)) {
    return { ok: true };
  }
  const workError = await changeTrackerWorkTasks(
    { ...input, onDeleteLocalWorkTask: input.onDeleteAnnotationTask },
    input.onRemoveFromSprint
  );
  if (workError) {
    return { error: workError, ok: false };
  }
  deleteFeatureLaneRowAnnotations(input);
  input.onRemoveBoardRow(input.rowId);
  return { ok: true };
}

/** Переносит фичу в другой спринт целиком: задачи Трекера и заметки/фото/схемы, без удаления. */
export async function submitMovedFeatureLane(
  input: FeatureLaneRowSprintChangeInput & {
    targetSprintId: number;
    onCommentsLeftSprint: (commentIds: string[]) => void;
    onMoveComments: (commentIds: string[], targetSprintId: number) => Promise<void>;
    onMoveToSprint: (taskId: string, sprintId: number) => Promise<void>;
    onTransferDraftRow?: (rowId: string, targetSprintId: number) => Promise<void>;
  }
): Promise<FeatureLaneRowSprintChangeResult> {
  if (!canMoveFeatureLane(input.rowId, input.sprintId)) {
    return { ok: true };
  }
  const workError = await changeTrackerWorkTasks(input, (taskId) =>
    input.onMoveToSprint(taskId, input.targetSprintId)
  );
  if (workError) {
    return { error: workError, ok: false };
  }
  const commentIds = collectFeatureLaneRowComments(input.rowId, input.comments).map(
    (comment) => comment.id
  );
  try {
    if (commentIds.length > 0) {
      await input.onMoveComments(commentIds, input.targetSprintId);
    }
    if (isFeatureLaneDraftRowId(input.rowId)) {
      if (!input.onTransferDraftRow) {
        return { error: input.failedMessage, ok: false };
      }
      await input.onTransferDraftRow(input.rowId, input.targetSprintId);
    }
  } catch {
    return { error: input.failedMessage, ok: false };
  }
  input.onCommentsLeftSprint(commentIds);
  input.onRemoveBoardRow(input.rowId);
  return { ok: true };
}
