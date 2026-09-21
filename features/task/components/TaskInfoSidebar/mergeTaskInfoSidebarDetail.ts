import type { IssueResponse, Task } from '@/types';

export function mergeTaskInfoSidebarDetail(
  task: Task,
  detail: IssueResponse | null | undefined,
  detailFetched: boolean
): Task {
  if (!detailFetched) {
    return task;
  }
  return {
    ...task,
    createdAt: detail?.createdAt ?? task.createdAt,
    description: task.description ?? detail?.description ?? '',
    resolvedAt: detail?.resolvedAt ?? task.resolvedAt,
    updatedAt: detail?.updatedAt ?? task.updatedAt,
  };
}
