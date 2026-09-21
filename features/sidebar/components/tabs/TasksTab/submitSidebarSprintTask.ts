import type { Task } from '@/types';
import type { QueryClient } from '@tanstack/react-query';

import { upsertSprintTaskInQueries } from '@/features/task/hooks/useTasks';
import { addIssueToSprint, createIssue } from '@/lib/api/issues';

type SidebarSprintTaskSubmitResult =
  | { ok: false; error: string }
  | { ok: true; issueKey: string; task: Task };

interface SubmitSidebarExistingSprintTaskInput {
  createFailedMessage: string;
  queryClient: QueryClient;
  selectedSprintId: number;
  selectedTask: Task;
  onUpserted: (task: Task) => void;
}

interface SubmitSidebarCreatedSprintTaskInput {
  createFailedMessage: string;
  issueType: string;
  missingQueueMessage: string;
  queryClient: QueryClient;
  queueKey: string;
  selectedSprintId: number;
  summary: string;
  onUpserted: (task: Task) => void;
}

function upsertLocalAndQuery(
  queryClient: QueryClient,
  sprintId: number,
  task: Task,
  onUpserted: (task: Task) => void
): void {
  upsertSprintTaskInQueries(queryClient, sprintId, task);
  onUpserted(task);
}

export async function submitSidebarExistingSprintTask(
  input: SubmitSidebarExistingSprintTaskInput
): Promise<SidebarSprintTaskSubmitResult> {
  const issueKey = input.selectedTask.id.trim();
  if (!issueKey) {
    return { ok: false, error: input.createFailedMessage };
  }

  const added = await addIssueToSprint(issueKey, input.selectedSprintId);
  if (!added) {
    return { ok: false, error: input.createFailedMessage };
  }

  upsertLocalAndQuery(
    input.queryClient,
    input.selectedSprintId,
    input.selectedTask,
    input.onUpserted
  );
  return { ok: true, issueKey, task: input.selectedTask };
}

export async function submitSidebarCreatedSprintTask(
  input: SubmitSidebarCreatedSprintTaskInput
): Promise<SidebarSprintTaskSubmitResult> {
  const queue = input.queueKey.trim();
  if (!queue) {
    return { ok: false, error: input.missingQueueMessage };
  }

  const summary = input.summary.trim();
  const created = await createIssue({
    summary,
    queue,
    sprintId: input.selectedSprintId,
    type: input.issueType.trim() || 'task',
  });
  if (!created.success || !created.key || !created.task) {
    return { ok: false, error: created.error || input.createFailedMessage };
  }

  upsertLocalAndQuery(
    input.queryClient,
    input.selectedSprintId,
    created.task,
    input.onUpserted
  );
  return { ok: true, issueKey: created.key, task: created.task };
}
