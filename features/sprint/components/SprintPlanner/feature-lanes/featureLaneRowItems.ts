import type { Comment, Task } from '@/types';

import { resolveTaskFeatureRowId } from '@/features/swimlane/utils/featureSwimlaneRows';
import { isPlannerAnnotation, isPlannerAnnotationDraft } from '@/lib/planner/plannerCardKind';

export function isOnFeatureLaneRow(
  rowId: string,
  item: Pick<Task, 'assignee' | 'epic' | 'id' | 'parent'>
): boolean {
  if (item.id === rowId) {
    return true;
  }
  return resolveTaskFeatureRowId(item) === rowId;
}

export function isOnFeatureLaneCommentRow(
  rowId: string,
  comment: Pick<Comment, 'assigneeId' | 'parent'>
): boolean {
  if (comment.assigneeId === rowId) {
    return true;
  }
  return resolveTaskFeatureRowId({
    assignee: comment.assigneeId,
    parent: comment.parent,
  }) === rowId;
}

export function collectFeatureLaneRowComments(
  rowId: string,
  comments: readonly Comment[]
): Comment[] {
  return comments.filter((comment) => isOnFeatureLaneCommentRow(rowId, comment));
}

export function collectFeatureLaneRowWorkTasks(rowId: string, tasks: readonly Task[]): Task[] {
  return tasks.filter((task) => {
    if (!isOnFeatureLaneRow(rowId, task)) {
      return false;
    }
    return !isPlannerAnnotation(task);
  });
}

export function deleteFeatureLaneRowAnnotations(input: {
  comments: readonly Comment[];
  rowId: string;
  tasks: readonly Task[];
  onCommentDelete: (commentId: string) => void;
  onDeleteAnnotationTask: (taskId: string) => void;
}): void {
  for (const comment of input.comments) {
    if (isOnFeatureLaneCommentRow(input.rowId, comment)) {
      input.onCommentDelete(comment.id);
    }
  }
  for (const task of input.tasks) {
    if (!isOnFeatureLaneRow(input.rowId, task)) {
      continue;
    }
    // Сохранённые аннотации удалены выше через comments; здесь — только клиентские черновики.
    if (isPlannerAnnotationDraft(task)) {
      input.onDeleteAnnotationTask(task.id);
    }
  }
}
