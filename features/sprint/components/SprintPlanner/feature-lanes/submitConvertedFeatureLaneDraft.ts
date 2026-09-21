import type { Comment, Task, TaskParent } from '@/types';

import { isPlannerAnnotationTask } from '@/features/task/utils/swimlaneImageTask';
import { createIssue, updateIssueParent } from '@/lib/api/issues';

import { isOnFeatureLaneCommentRow, isOnFeatureLaneRow } from './featureLaneRowItems';

interface ReparentFeatureLaneDraftInput {
  comments: Comment[];
  parent: TaskParent;
  parentUpdateFailedMessage: string;
  rowId: string;
  sprintId?: number | null;
  tasks: Task[];
  onCommentParentChange: (commentId: string, parent: TaskParent | null) => void;
  onLocalTaskParentChange: (taskId: string, parent: TaskParent) => void;
}

interface SubmitConvertedFeatureLaneDraftInput
  extends Omit<ReparentFeatureLaneDraftInput, 'parent'> {
  createFailedMessage: string;
  issueType: string;
  missingQueueMessage: string;
  queueKey: string;
  selectedSprintId: number;
  summary: string;
  onCreatedTask: (task: Task) => void;
  onReplaceDraftRow: (rowId: string, next: { id: string; name: string }) => void;
}

interface SubmitExistingFeatureLaneDraftInput
  extends Omit<ReparentFeatureLaneDraftInput, 'parent'> {
  selectedTask: Task;
  onReplaceDraftRow: (rowId: string, next: { id: string; name: string }) => void;
}

type SubmitConvertedFeatureLaneDraftResult =
  | { ok: false; error: string }
  | { ok: true; issueKey: string; task: Task };

interface SubmitCreatedFeatureLaneInput {
  createFailedMessage: string;
  issueType: string;
  missingQueueMessage: string;
  queueKey: string;
  selectedSprintId: number;
  summary: string;
  onCreatedTask: (task: Task) => void;
  onPinTrackerRow: (next: { id: string; name: string }) => void;
}

interface SubmitAttachedFeatureLaneInput {
  emptyKeyMessage: string;
  selectedTask: Task;
  onPinTrackerRow: (next: { id: string; name: string }) => void;
}

function buildTrackerParent(issueKey: string, task: Task, fallbackName: string): TaskParent {
  return {
    display: task.name?.trim() || fallbackName,
    id: issueKey,
    key: issueKey,
  };
}

async function createFeatureLaneTrackerIssue(input: {
  createFailedMessage: string;
  issueType: string;
  missingQueueMessage: string;
  queueKey: string;
  selectedSprintId: number;
  summary: string;
}): Promise<
  | { error: string; ok: false }
  | { issueKey: string; ok: true; parent: TaskParent; task: Task }
> {
  const queue = input.queueKey.trim();
  if (!queue) {
    return { error: input.missingQueueMessage, ok: false };
  }
  const summary = input.summary.trim();
  const created = await createIssue({
    summary,
    queue,
    sprintId: input.selectedSprintId,
    type: input.issueType.trim() || 'story',
  });
  if (!created.success || !created.key || !created.task) {
    return { error: created.error || input.createFailedMessage, ok: false };
  }
  return {
    issueKey: created.key,
    ok: true,
    parent: buildTrackerParent(created.key, created.task, summary),
    task: created.task,
  };
}

function isFeatureLaneDraftChildTask(rowId: string, parent: TaskParent, task: Task): boolean {
  if (task.id === parent.id || task.id === parent.key) {
    return false;
  }
  return isOnFeatureLaneRow(rowId, task);
}

function applyLocalFeatureLaneDraftReparent(input: ReparentFeatureLaneDraftInput): void {
  for (const comment of input.comments) {
    if (isOnFeatureLaneCommentRow(input.rowId, comment)) {
      input.onCommentParentChange(comment.id, input.parent);
    }
  }
  for (const task of input.tasks) {
    if (isFeatureLaneDraftChildTask(input.rowId, input.parent, task)) {
      input.onLocalTaskParentChange(task.id, input.parent);
    }
  }
}

async function persistFeatureLaneDraftTrackerParents(
  input: ReparentFeatureLaneDraftInput
): Promise<{ error: string; ok: false } | { ok: true }> {
  for (const task of input.tasks) {
    if (!isFeatureLaneDraftChildTask(input.rowId, input.parent, task)) {
      continue;
    }
    if (isPlannerAnnotationTask(task) || task.isLocalTask === true) {
      continue;
    }
    const updated = await updateIssueParent(task.id, input.parent.key, input.sprintId);
    if (!updated) {
      return { error: input.parentUpdateFailedMessage, ok: false };
    }
  }
  return { ok: true };
}

function finishConvertedFeatureLaneDraft(
  input: ReparentFeatureLaneDraftInput & {
    nextRow: { id: string; name: string };
    onReplaceDraftRow: (rowId: string, next: { id: string; name: string }) => void;
  }
): void {
  applyLocalFeatureLaneDraftReparent(input);
  input.onReplaceDraftRow(input.rowId, input.nextRow);
}

export async function submitConvertedFeatureLaneDraft(
  input: SubmitConvertedFeatureLaneDraftInput
): Promise<SubmitConvertedFeatureLaneDraftResult> {
  const created = await createFeatureLaneTrackerIssue(input);
  if (!created.ok) {
    return created;
  }
  const reparentInput = { ...input, parent: created.parent, sprintId: input.selectedSprintId };
  finishConvertedFeatureLaneDraft({
    ...reparentInput,
    nextRow: { id: created.issueKey, name: created.parent.display },
  });
  input.onCreatedTask(created.task);
  const reparented = await persistFeatureLaneDraftTrackerParents(reparentInput);
  if (!reparented.ok) {
    return reparented;
  }
  return { ok: true, issueKey: created.issueKey, task: created.task };
}

export async function submitCreatedFeatureLane(
  input: SubmitCreatedFeatureLaneInput
): Promise<SubmitConvertedFeatureLaneDraftResult> {
  const created = await createFeatureLaneTrackerIssue(input);
  if (!created.ok) {
    return created;
  }
  input.onCreatedTask(created.task);
  input.onPinTrackerRow({ id: created.issueKey, name: created.parent.display });
  return { ok: true, issueKey: created.issueKey, task: created.task };
}

export function submitAttachedFeatureLane(
  input: SubmitAttachedFeatureLaneInput
): SubmitConvertedFeatureLaneDraftResult {
  const issueKey = input.selectedTask.id.trim();
  if (!issueKey) {
    return { error: input.emptyKeyMessage, ok: false };
  }
  const parent = buildTrackerParent(issueKey, input.selectedTask, issueKey);
  input.onPinTrackerRow({ id: issueKey, name: parent.display });
  return { ok: true, issueKey, task: input.selectedTask };
}

export async function submitExistingFeatureLaneDraft(
  input: SubmitExistingFeatureLaneDraftInput
): Promise<SubmitConvertedFeatureLaneDraftResult> {
  const issueKey = input.selectedTask.id.trim();
  if (!issueKey) {
    return { ok: false, error: input.parentUpdateFailedMessage };
  }
  const parent = buildTrackerParent(issueKey, input.selectedTask, issueKey);
  const reparentInput = { ...input, parent };
  finishConvertedFeatureLaneDraft({
    ...reparentInput,
    nextRow: { id: issueKey, name: parent.display },
  });
  const reparented = await persistFeatureLaneDraftTrackerParents(reparentInput);
  if (!reparented.ok) {
    return reparented;
  }
  return { ok: true, issueKey, task: input.selectedTask };
}
