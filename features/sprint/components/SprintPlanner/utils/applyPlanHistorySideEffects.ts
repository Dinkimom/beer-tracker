/**
 * Side-effects undo/redo: parents задач (режим «по фичам») и layout заметок.
 */

import type {
  CommentHistorySlice,
  PlanHistoryAppliedPayload,
} from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Comment, Task, TaskParent } from '@/types';
import type { Dispatch, SetStateAction } from 'react';

import {
  applyLocalParentToTasks,
  trackerParentKeyAfterPlannerChange,
} from '@/features/sprint/components/SprintPlanner/hooks/useSprintPlannerUIHandlers/hooks/useSprintPlannerContextMenuHandlers';
import { isFeatureLaneDraftParent } from '@/features/swimlane/utils/featureSwimlaneRows';
import { updateIssueParent } from '@/lib/api/issues';
import {
  emptyFeatureLanesDocument,
  setFeatureLaneDraftIssueParent,
  type FeatureLanesDocument,
} from '@/lib/sprints/featureLanesDocument';

type FeatureLanesUpdater = (
  updater: (prev: FeatureLanesDocument | undefined) => FeatureLanesDocument
) => void;

function applyCommentSlice(comment: Comment, slice: CommentHistorySlice): Comment {
  return {
    ...comment,
    assigneeId: slice.assigneeId,
    day: slice.day,
    height: slice.height,
    parent: slice.parent,
    part: slice.part,
    width: slice.width,
    x: slice.x,
    y: slice.y,
  };
}

export function applyPlanHistoryCommentSlices(
  comments: Map<string, CommentHistorySlice> | undefined,
  setComments: Dispatch<SetStateAction<Comment[]>>
): void {
  if (!comments || comments.size === 0) {
    return;
  }
  setComments((prev) => {
    let changed = false;
    const next = prev.map((comment) => {
      const slice = comments.get(comment.id);
      if (!slice) {
        return comment;
      }
      changed = true;
      return applyCommentSlice(comment, slice);
    });
    return changed ? next : prev;
  });
}

export function applyPlanHistoryTaskParents(input: {
  selectedSprintId: number | null;
  taskParents: Map<string, TaskParent | null> | undefined;
  setFeatureLanes: FeatureLanesUpdater;
  setTasks: Dispatch<SetStateAction<Task[]>>;
  onParentLayoutChanged?: () => void;
}): void {
  const { taskParents } = input;
  if (!taskParents || taskParents.size === 0) {
    return;
  }

  taskParents.forEach((parent, taskId) => {
    input.setFeatureLanes((prev) =>
      setFeatureLaneDraftIssueParent(
        prev ?? emptyFeatureLanesDocument(),
        taskId,
        parent && isFeatureLaneDraftParent(parent) ? parent.id : null
      )
    );

    let previousParent: TaskParent | undefined;
    input.setTasks((prev) => {
      const applied = applyLocalParentToTasks(prev, taskId, parent);
      previousParent = applied.previous;
      return applied.next;
    });
    input.onParentLayoutChanged?.();

    const trackerParentKey = trackerParentKeyAfterPlannerChange(previousParent, parent);
    if (trackerParentKey === undefined) {
      return;
    }
    updateIssueParent(taskId, trackerParentKey, input.selectedSprintId)
      .then((ok) => {
        if (ok) {
          return;
        }
        input.setTasks((prev) => applyLocalParentToTasks(prev, taskId, previousParent ?? null).next);
        input.setFeatureLanes((prev) =>
          setFeatureLaneDraftIssueParent(
            prev ?? emptyFeatureLanesDocument(),
            taskId,
            isFeatureLaneDraftParent(previousParent ?? null) ? previousParent?.id ?? null : null
          )
        );
        input.onParentLayoutChanged?.();
      })
      .catch(() => undefined);
  });
}

export function applyPlanHistorySideEffects(
  payload: PlanHistoryAppliedPayload,
  input: {
    selectedSprintId: number | null;
    setComments: Dispatch<SetStateAction<Comment[]>>;
    setFeatureLanes: FeatureLanesUpdater;
    setTasks: Dispatch<SetStateAction<Task[]>>;
    onParentLayoutChanged?: () => void;
  }
): void {
  applyPlanHistoryTaskParents({
    selectedSprintId: input.selectedSprintId,
    setFeatureLanes: input.setFeatureLanes,
    setTasks: input.setTasks,
    taskParents: payload.taskParents,
    onParentLayoutChanged: input.onParentLayoutChanged,
  });
  applyPlanHistoryCommentSlices(payload.comments, input.setComments);
}
