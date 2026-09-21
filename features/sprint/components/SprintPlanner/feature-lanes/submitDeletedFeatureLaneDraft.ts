import type { Comment, Task } from '@/types';

import { updateIssueParent } from '@/lib/api/issues';
import { isFeatureLaneDraftRowId } from '@/lib/sprints/featureLanesDocument';

import {
  collectFeatureLaneRowWorkTasks,
  deleteFeatureLaneRowAnnotations,
} from './featureLaneRowItems';

interface SubmitDeletedFeatureLaneDraftInput {
  comments: Comment[];
  parentUpdateFailedMessage: string;
  rowId: string;
  tasks: Task[];
  onClearTaskParent: (taskId: string) => void;
  onCommentDelete: (commentId: string) => void;
  onDeleteAnnotationTask: (taskId: string) => void;
  onRemoveDraftRow: (rowId: string) => void;
}

type SubmitDeletedFeatureLaneDraftResult = { error: string; ok: false } | { ok: true };

async function moveWorkTasksOffDraftRow(
  input: SubmitDeletedFeatureLaneDraftInput
): Promise<string | null> {
  for (const task of collectFeatureLaneRowWorkTasks(input.rowId, input.tasks)) {
    if (task.isLocalTask !== true) {
      const updated = await updateIssueParent(task.id, null);
      if (!updated) {
        return input.parentUpdateFailedMessage;
      }
    }
    input.onClearTaskParent(task.id);
  }
  return null;
}

/** Снимает черновую строку: заметки/картинки/схемы удаляет, задачи переносит в «Без родителя». */
export async function submitDeletedFeatureLaneDraft(
  input: SubmitDeletedFeatureLaneDraftInput
): Promise<SubmitDeletedFeatureLaneDraftResult> {
  if (!isFeatureLaneDraftRowId(input.rowId)) {
    return { ok: true };
  }
  const parentError = await moveWorkTasksOffDraftRow(input);
  if (parentError) {
    return { error: parentError, ok: false };
  }
  deleteFeatureLaneRowAnnotations(input);
  input.onRemoveDraftRow(input.rowId);
  return { ok: true };
}
