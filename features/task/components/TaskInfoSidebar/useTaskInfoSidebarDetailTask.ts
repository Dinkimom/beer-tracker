import type { IssueResponse, Task } from '@/types';
import type { QueryClient } from '@tanstack/react-query';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { mergeTaskInfoSidebarDetail } from '@/features/task/components/TaskInfoSidebar/mergeTaskInfoSidebarDetail';
import { getIssue } from '@/lib/api/issues';

interface TaskInfoSavedFields {
  description?: string;
  name?: string;
}

export function issueDetailQueryKey(issueKey: string) {
  return ['issue-detail', issueKey] as const;
}

export function patchIssueDetailQueryFields(
  queryClient: QueryClient,
  issueKey: string,
  fields: TaskInfoSavedFields
): void {
  const queryKey = issueDetailQueryKey(issueKey);
  queryClient.cancelQueries({ queryKey }).catch(() => undefined);
  queryClient.setQueryData<IssueResponse>(queryKey, (old) => {
    if (!old) {
      return old;
    }
    return {
      ...old,
      ...(fields.description !== undefined ? { description: fields.description } : {}),
      ...(fields.name !== undefined ? { summary: fields.name } : {}),
    };
  });
}

export function applyTaskInfoSavedFields(task: Task, saved: TaskInfoSavedFields): Task {
  if (saved.description === undefined && saved.name === undefined) {
    return task;
  }
  return {
    ...task,
    ...(saved.description !== undefined ? { description: saved.description } : {}),
    ...(saved.name !== undefined ? { name: saved.name } : {}),
  };
}

export function useTaskInfoSidebarDetailTask(task: Task): {
  applySavedFields: (fields: TaskInfoSavedFields) => void;
  isDescriptionLoading: boolean;
  task: Task;
} {
  const queryClient = useQueryClient();
  const [savedFields, setSavedFields] = useState<TaskInfoSavedFields>({});
  const [savedFieldsTaskId, setSavedFieldsTaskId] = useState(task.id);
  if (task.id !== savedFieldsTaskId) {
    setSavedFieldsTaskId(task.id);
    setSavedFields({});
  }
  const overlay = task.id === savedFieldsTaskId ? savedFields : {};

  const needsDetail =
    !task.isLocalTask && task.description === undefined && overlay.description === undefined;
  const { data, isFetched, isPending } = useQuery({
    enabled: needsDetail && Boolean(task.id),
    queryFn: () => getIssue(task.id),
    queryKey: issueDetailQueryKey(task.id),
    staleTime: 60 * 1000,
  });

  const applySavedFields = useCallback(
    (fields: TaskInfoSavedFields) => {
      patchIssueDetailQueryFields(queryClient, task.id, fields);
      setSavedFields((prev) => ({ ...prev, ...fields }));
    },
    [queryClient, task.id]
  );

  return {
    applySavedFields,
    isDescriptionLoading: needsDetail && isPending,
    task: applyTaskInfoSavedFields(mergeTaskInfoSidebarDetail(task, data, isFetched), overlay),
  };
}
