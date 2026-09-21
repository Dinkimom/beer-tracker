import type { Task, TaskParent } from '@/types';

function slimTaskParent(parent: TaskParent): TaskParent {
  return {
    display: parent.display,
    id: parent.id,
    key: parent.key,
  };
}

function slimSprintRefs(
  sprints: NonNullable<Task['sprints']>
): NonNullable<Task['sprints']> {
  return sprints.map((sprint) => ({
    display: sprint.display,
    id: sprint.id,
  }));
}

/**
 * Поля для доски/занятости. Описание и даты обновления —
 * в GET /api/issues/:key при открытии сайдбара.
 */
export function slimSprintPlannerListTask(task: Task): Task {
  const next: Task = {
    ...task,
    ...(task.parent ? { parent: slimTaskParent(task.parent) } : {}),
    ...(task.epic ? { epic: slimTaskParent(task.epic) } : {}),
    ...(task.sprints ? { sprints: slimSprintRefs(task.sprints) } : {}),
  };
  delete next.description;
  delete next.updatedAt;
  delete next.resolvedAt;
  return next;
}
