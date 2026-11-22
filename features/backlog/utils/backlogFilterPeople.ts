import type { AvatarInitialsVariant } from '@/components/Avatar';
import type { Developer, Task } from '@/types';

import { getAvatarVariantForDeveloper, getAvatarVariantForTeam } from '@/components/Avatar';

export interface BacklogFilterPerson {
  avatarUrl?: string | null;
  id: string;
  /** Цвет инициалов — как на карточке задачи: по человеку, без него — по команде задачи. */
  initialsVariant: AvatarInitialsVariant;
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
    initialsVariant: getAvatarVariantForDeveloper(developer),
    name: developer.name,
    taskCount: 0,
  });
}

/** Чья задача для фильтра: по умолчанию исполнитель в трекере; на доске спринта — строка карточки. */
type TaskAssigneeOf = (task: Task) => string | null | undefined;

const trackerAssigneeOf: TaskAssigneeOf = (task) => task.assignee;

function noteTaskAssignee(byId: Map<string, PersonAcc>, task: Task, assigneeOf: TaskAssigneeOf): void {
  const assigneeId = assigneeOf(task);
  if (!assigneeId) return;
  const current = byId.get(assigneeId);
  if (current) {
    current.taskCount += 1;
    return;
  }
  // Имя из задачи годится, только если это её исполнитель в трекере.
  const name = assigneeId === task.assignee ? task.assigneeName?.trim() : undefined;
  if (!name) return;
  byId.set(assigneeId, {
    avatarUrl: null,
    id: assigneeId,
    initialsVariant: getAvatarVariantForTeam(task.team),
    name,
    taskCount: 1,
  });
}

/** Люди, у которых есть задачи в бэклоге или спринтах. Чаще назначенные — раньше. */
export function collectBacklogFilterPeople(input: {
  assigneeOf?: TaskAssigneeOf;
  backlogDevelopers: Developer[];
  backlogTasks: Task[];
  sprintBundles: Array<SprintPeopleBundle | undefined>;
}): BacklogFilterPerson[] {
  const byId = new Map<string, PersonAcc>();
  const assigneeOf = input.assigneeOf ?? trackerAssigneeOf;
  for (const developer of input.backlogDevelopers) {
    rememberDeveloper(byId, developer);
  }
  for (const bundle of input.sprintBundles) {
    for (const developer of bundle?.developers ?? []) {
      rememberDeveloper(byId, developer);
    }
  }
  for (const task of input.backlogTasks) {
    noteTaskAssignee(byId, task, assigneeOf);
  }
  for (const bundle of input.sprintBundles) {
    for (const task of bundle?.tasks ?? []) {
      noteTaskAssignee(byId, task, assigneeOf);
    }
  }

  return [...byId.values()]
    .filter((person) => person.taskCount > 0)
    .sort(
      (a, b) =>
        b.taskCount - a.taskCount || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    )
    .map(({ avatarUrl, id, initialsVariant, name }) => ({ avatarUrl, id, initialsVariant, name }));
}

export function filterTasksByAssignees(
  tasks: Task[],
  assigneeIds: ReadonlySet<string>,
  assigneeOf: TaskAssigneeOf = trackerAssigneeOf
): Task[] {
  if (assigneeIds.size === 0) return tasks;
  return tasks.filter((task) => {
    const assigneeId = assigneeOf(task);
    return assigneeId != null && assigneeIds.has(assigneeId);
  });
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
