import type { QuickAddCreateFields } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { Comment, Task, TaskParent, TaskPosition } from '@/types';

import { commentToPersistedTaskPosition } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { createIssue } from '@/lib/api/issues';
import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';

import { trackerParentKeyForCreate } from './applyQuickAddDraftFields';

interface SubmitConvertedSwimlaneCommentInput {
  comment: Comment;
  createFailedMessage: string;
  defaultQueue: string | null;
  draftTitle?: string;
  fallbackTitle: string;
  fields?: QuickAddCreateFields;
  missingAssigneeMessage: string;
  missingQueueMessage: string;
  plannerParent?: TaskParent;
  selectedSprintId: number;
  invalidateOccupancyQueries: () => void;
  onCommentDelete: (commentId: string) => void;
  savePosition: (position: TaskPosition, isQa: boolean) => Promise<void>;
  setTaskPositions: (
    updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>
  ) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}

type SubmitConvertedSwimlaneCommentResult =
  | { ok: false; error: string }
  | { ok: true; issueKey: string; task: Task };

export async function submitConvertedSwimlaneComment(
  input: SubmitConvertedSwimlaneCommentInput
): Promise<SubmitConvertedSwimlaneCommentResult> {
  const queue = input.fields?.queueKey.trim() || input.defaultQueue;
  if (!queue) {
    return { ok: false, error: input.missingQueueMessage };
  }
  const assigneeId = input.fields?.assigneeId?.trim() || input.comment.assigneeId;
  if (isTeamSwimlaneAssigneeId(assigneeId)) {
    return { ok: false, error: input.missingAssigneeMessage };
  }
  const created = await createIssue({
    summary: input.draftTitle?.trim() || input.comment.text.trim() || input.fallbackTitle,
    assignee: assigneeId,
    parent: trackerParentKeyForCreate(
      input.fields?.parentKey || input.comment.parent?.key || input.comment.parent?.id
    ),
    queue,
    sprintId: input.selectedSprintId,
    type: input.fields?.issueType.trim() || 'task',
  });
  if (!created.success || !created.key || !created.task) {
    return { ok: false, error: created.error || input.createFailedMessage };
  }
  const createdTask = input.plannerParent
    ? { ...created.task, parent: input.plannerParent }
    : created.task;
  const issueKey = created.key;
  const savedPosition = {
    ...commentToPersistedTaskPosition(input.comment, issueKey),
    assignee: assigneeId,
  };
  await input.savePosition(savedPosition, false);
  input.setTasks((prev) => [
    ...prev.filter((task) => task.id !== issueKey),
    createdTask,
  ]);
  input.setTaskPositions((prev) => {
    const next = new Map(prev);
    next.set(issueKey, savedPosition);
    return next;
  });
  input.onCommentDelete(input.comment.id);
  input.invalidateOccupancyQueries();
  return { ok: true, issueKey, task: createdTask };
}
