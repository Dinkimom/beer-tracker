import type { Developer, Task } from '@/types';

export interface BacklogFilterPerson {
  avatarUrl?: string | null;
  id: string;
  name: string;
}

interface PersonAcc extends BacklogFilterPerson {
  taskCount: number;
}

interface SprintPeopleBundle {
  developers?: Developer[];
  tasks?: Task[];
}

function rememberDeveloper(byId: Map<string, PersonAcc>, developer: Developer): void {
  const current = byId.get(developer.id);
  if (current) {
    if (!current.avatarUrl && developer.avatarUrl) {
      current.avatarUrl = developer.avatarUrl;
    }
    if (developer.name && current.name === current.id) {
      current.name = developer.name;
    }
    return;
  }
  byId.set(developer.id, {
    avatarUrl: developer.avatarUrl,
    id: developer.id,
    name: developer.name,
    taskCount: 0,
  });
}

function noteTaskAssignee(byId: Map<string, PersonAcc>, task: Task): void {
  if (!task.assignee) return;
  const current = byId.get(task.assignee);
  if (current) {
    current.taskCount += 1;
    return;
  }
  const name = task.assigneeName?.trim();
  if (!name) return;
  byId.set(task.assignee, {
    avatarUrl: null,
    id: task.assignee,
    name,
    taskCount: 1,
  });
}

/** Люди, у которых есть задачи в бэклоге или спринтах. Чаще назначенные — раньше. */
export function collectBacklogFilterPeople(input: {
  backlogDevelopers: Developer[];
  backlogTasks: Task[];
  sprintBundles: Array<SprintPeopleBundle | undefined>;
}): BacklogFilterPerson[] {
  const byId = new Map<string, PersonAcc>();
  for (const developer of input.backlogDevelopers) {
    rememberDeveloper(byId, developer);
  }
  for (const bundle of input.sprintBundles) {
    for (const developer of bundle?.developers ?? []) {
      rememberDeveloper(byId, developer);
    }
  }
  for (const task of input.backlogTasks) {
    noteTaskAssignee(byId, task);
  }
  for (const bundle of input.sprintBundles) {
    for (const task of bundle?.tasks ?? []) {
      noteTaskAssignee(byId, task);
    }
  }

  return [...byId.values()]
    .filter((person) => person.taskCount > 0)
    .sort(
      (a, b) =>
        b.taskCount - a.taskCount || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    )
    .map(({ avatarUrl, id, name }) => ({ avatarUrl, id, name }));
}

export function filterTasksByAssignees(tasks: Task[], assigneeIds: ReadonlySet<string>): Task[] {
  if (assigneeIds.size === 0) return tasks;
  return tasks.filter((task) => task.assignee != null && assigneeIds.has(task.assignee));
}

/** Оставляет только выбранных людей, которые есть в текущем списке. */
export function selectedAssigneeIdsInPeople(
  selectedIds: ReadonlySet<string>,
  people: ReadonlyArray<{ id: string }>
): ReadonlySet<string> {
  if (selectedIds.size === 0) return selectedIds;
  const known = new Set(people.map((person) => person.id));
  const next = new Set<string>();
  for (const id of selectedIds) {
    if (known.has(id)) next.add(id);
  }
  return next.size === selectedIds.size ? selectedIds : next;
}
