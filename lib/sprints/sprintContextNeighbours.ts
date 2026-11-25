import type {
  SprintContextNeighbourPerson,
  SprintContextNeighbourTask,
  SprintContextPayload,
  SprintContextPosition,
  SprintContextUnplannedTask,
} from '@/lib/sprints/sprintContextTypes';

import { cardDatesOfPayload, sprintTaskDone } from '@/lib/sprints/sprintContextToday';

interface NeighbourSprintRef {
  endDate: string;
  id: number;
  name: string;
  startDate: string;
  status: string;
}

/** Предыдущий и следующий спринт доски по датам начала; спринта нет в списке доски — соседей нет. */
export function pickNeighbourSprints<T extends NeighbourSprintRef>(
  sprints: readonly T[],
  sprintId: number
): { next?: T; previous?: T } {
  const ordered = [...sprints].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id - b.id);
  const index = ordered.findIndex((sprint) => sprint.id === sprintId);
  if (index === -1) {
    return {};
  }
  return { next: ordered[index + 1], previous: index > 0 ? ordered[index - 1] : undefined };
}

interface PersonAccumulator {
  assigneeName?: string;
  parts: number;
  tasks: SprintContextNeighbourTask[];
}

function addTask(
  people: Map<string | null, PersonAccumulator>,
  person: { assigneeId: string | null; assigneeName?: string | null },
  task: SprintContextNeighbourTask,
  parts: number
): void {
  const entry = people.get(person.assigneeId) ?? { parts: 0, tasks: [] };
  if (!entry.assigneeName && person.assigneeName) {
    entry.assigneeName = person.assigneeName;
  }
  entry.parts += parts;
  entry.tasks.push(task);
  people.set(person.assigneeId, entry);
}

function positionTask(
  position: SprintContextPosition,
  card: { endDate: string; startDate: string } | undefined,
  done: boolean | null
): SprintContextNeighbourTask {
  const { schedule } = position;
  return {
    done,
    onBoard: true,
    taskId: position.taskId,
    ...(position.summary ? { summary: position.summary } : {}),
    ...(position.statusCategory ? { statusCategory: position.statusCategory } : {}),
    ...(card ? { plannedEnd: card.endDate, plannedStart: card.startDate } : {}),
    ...(schedule ? { partsLeft: schedule.partsLeft, state: schedule.state } : {}),
  };
}

function unplannedTask(task: SprintContextUnplannedTask, done: boolean | null): SprintContextNeighbourTask {
  return {
    done,
    onBoard: false,
    summary: task.summary,
    taskId: task.taskId,
    ...(task.statusCategory ? { statusCategory: task.statusCategory } : {}),
  };
}

/**
 * Соседний спринт по людям. `tail` (предыдущий спринт) — только незакрытые задачи, которые трекер ещё держит
 * в нём: входящий хвост, parts = сколько частей плана у них осталось с сегодня. `planned` (следующий спринт) —
 * всё, что в нём уже стоит, parts = длина карточек. Задачи бэклога спринта без карточки — без дат и частей.
 */
export function summarizeNeighbourSprint(
  payload: Pick<SprintContextPayload, 'meta' | 'positions' | 'unplannedTasks'>,
  mode: 'planned' | 'tail'
): SprintContextNeighbourPerson[] {
  const cards = cardDatesOfPayload(payload);
  const people = new Map<string | null, PersonAccumulator>();
  const keep = (done: boolean | null) => mode === 'planned' || done !== true;
  const partsOf = (position: SprintContextPosition) =>
    mode === 'tail' ? (position.schedule?.partsLeft ?? 0) : position.duration;
  for (const position of payload.positions) {
    const done = sprintTaskDone(position);
    if (position.inTrackerSprint === false || !keep(done)) continue;
    const person = { assigneeId: position.assigneeId || null, assigneeName: position.assigneeName };
    addTask(people, person, positionTask(position, cards[position.taskId], done), partsOf(position));
  }
  for (const task of payload.unplannedTasks ?? []) {
    const done = sprintTaskDone(task);
    if (!keep(done)) continue;
    addTask(people, { assigneeId: task.assigneeId ?? null, assigneeName: task.assigneeName }, unplannedTask(task, done), 0);
  }
  return [...people].map(([assigneeId, entry]) => ({
    assigneeId,
    ...(entry.assigneeName ? { assigneeName: entry.assigneeName } : {}),
    parts: entry.parts,
    tasks: entry.tasks,
  }));
}
