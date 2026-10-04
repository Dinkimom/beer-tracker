/** Сколько задач секция показывает, пока список не раскрыт. Как «5 из 39» в бэклоге Джиры. */
const BACKLOG_TASK_PREVIEW_COUNT = 5;

export function previewBacklogTasks<T>(tasks: readonly T[], showAll: boolean): readonly T[] {
  if (showAll || tasks.length <= BACKLOG_TASK_PREVIEW_COUNT) return tasks;
  return tasks.slice(0, BACKLOG_TASK_PREVIEW_COUNT);
}

export function backlogSectionCountKey(
  shown: number,
  total: number
): { key: string; params: Record<string, number> } {
  if (shown < total) {
    return { key: 'backlog.section.visibleCount', params: { total, visible: shown } };
  }
  return { key: 'backlog.section.taskCount', params: { count: total } };
}

export function backlogTaskPreviewResetKey(input: {
  assigneeIds: ReadonlySet<string>;
  nameFilter: string;
  statusFilter: string;
}): string {
  return `${input.nameFilter}|${input.statusFilter}|${[...input.assigneeIds].sort().join(',')}`;
}
