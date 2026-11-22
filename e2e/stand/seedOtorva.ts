/**
 * Сид встроенного трекера стенда из фикстур демо (`lib/demo/`): те же люди, задачи, статусы, оценки
 * и родитель, что на `/demo/planner`, — через REST otorva от имени первого админа. Ключи otorva свои
 * (`DEMO-1`…), соответствие ключам фикстуры — в результате. Спринты — вокруг сегодняшней даты:
 * часы стенда настоящие, в отличие от замороженных часов демо.
 */
import type { Task } from '@/types';

import { buildDemoBacklogTasks, buildDemoDevelopers, buildDemoSprintTasks } from '@/lib/demo/demoFixtureSeedTasks';

import { STAND_ADMIN, STAND_OTORVA_URL } from './stand';

export interface StandSeed {
  boardId: number;
  /** Ключ фикстуры (`DEMO-101`) → ключ otorva. */
  keys: Record<string, string>;
  /** Email человека фикстуры → id профиля otorva. */
  people: Record<string, string>;
  sprints: { current: number; next: number; previous: number };
}

/** Пароль людей фикстуры в otorva: стенд одноразовый. */
const PEOPLE_SECRET = 'stand-people-123';

/** Шагов по линейному workflow otorva от начального статуса: беклог → готово к работе → в работе → … → закрыт. */
const STEPS_BY_STATUS_TYPE: Record<string, number> = { done: 8, inProgress: 2, new: 0, paused: 5 };
/** Типы фикстуры, которых нет в otorva. */
const TYPE_KEYS: Record<string, string> = { goal: 'task' };

type Api = <T>(method: string, path: string, body?: unknown) => Promise<T>;

function createApi(token: string): Api {
  return async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const response = await fetch(`${STAND_OTORVA_URL}${path}`, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      method,
    });
    if (!response.ok) {
      throw new Error(`otorva ${method} ${path}: ${response.status} ${await response.text()}`);
    }
    return (response.status === 204 ? undefined : await response.json()) as T;
  };
}

async function otorvaLogin(email: string, password: string): Promise<string> {
  const response = await fetch(`${STAND_OTORVA_URL}/auth/login`, {
    body: JSON.stringify({ email, password }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`otorva login ${email}: ${response.status}`);
  }
  return ((await response.json()) as { token: string }).token;
}

function isoDay(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Понедельник текущей недели — начало текущего спринта. */
function currentSprintStart(now: Date): Date {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

async function createPeople(api: Api): Promise<Record<string, string>> {
  const people: Record<string, string> = {};
  for (const dev of buildDemoDevelopers()) {
    const [first, ...rest] = dev.name.split(' ');
    const profile = await api<{ id: string }>('POST', '/profiles', {
      email: dev.email,
      first_name: first,
      last_name: rest.join(' '),
      password: PEOPLE_SECRET,
    });
    people[dev.email ?? dev.id] = profile.id;
  }
  return people;
}

async function createSprints(api: Api, boardId: number): Promise<StandSeed['sprints']> {
  const start = currentSprintStart(new Date());
  const sprint = (name: string, from: Date, status: string) =>
    api<{ id: number }>('POST', '/sprints', {
      board_id: boardId,
      end_date: isoDay(addDays(from, 11)),
      name,
      start_date: isoDay(from),
      status,
    });
  const previous = await sprint('Спринт 1', addDays(start, -14), 'released');
  const current = await sprint('Спринт 2', start, 'in_progress');
  const next = await sprint('Спринт 3', addDays(start, 14), 'draft');
  return { current: current.id, next: next.id, previous: previous.id };
}

async function moveToStatus(api: Api, taskId: string, steps: number): Promise<void> {
  for (let i = 0; i < steps; i += 1) {
    // Ответ — статусы, в которые можно перейти; workflow по умолчанию линейный.
    const targets = await api<{ id: string }[]>('GET', `/tasks/${taskId}/transitions`);
    const next = targets[0];
    if (!next) return;
    await api('POST', `/tasks/${taskId}/transition`, { to_status_id: next.id });
  }
}

interface SeedContext {
  api: Api;
  developers: Map<string, string>;
  keys: Record<string, string>;
  people: Record<string, string>;
  queueId: string;
  typeIds: Map<string, string>;
}

async function createTask(ctx: SeedContext, task: Task, sprintId: number | null, parentId: string | null): Promise<string> {
  const email = task.assignee ? ctx.developers.get(task.assignee) : undefined;
  const typeKey = TYPE_KEYS[task.type ?? 'task'] ?? task.type ?? 'task';
  const created = await ctx.api<{ id: string; key: string }>('POST', '/tasks', {
    assignee_id: email ? ctx.people[email] : null,
    description: '',
    parent_id: parentId,
    queue_id: ctx.queueId,
    task_type_id: ctx.typeIds.get(typeKey) ?? ctx.typeIds.get('task'),
    title: task.name,
  });
  await ctx.api('PUT', `/tasks/${created.id}`, {
    story_points: task.storyPoints ?? null,
    test_points: task.testPoints ?? null,
  });
  if (sprintId) {
    await ctx.api('POST', `/sprints/${sprintId}/tasks`, { task_id: created.id });
  }
  await moveToStatus(ctx.api, created.id, STEPS_BY_STATUS_TYPE[task.statusTypeKey ?? 'new'] ?? 0);
  ctx.keys[task.id] = created.key;
  return created.id;
}

/** REST otorva от имени первого админа — сид и проверки «что записалось в трекер». */
export async function standOtorvaApi(): Promise<Api> {
  return createApi(await otorvaLogin(STAND_ADMIN.email, STAND_ADMIN.secret));
}

export async function seedStandOtorva(): Promise<StandSeed> {
  const api = await standOtorvaApi();
  const people = await createPeople(api);
  const queue = await api<{ id: string }>('POST', '/queues', { key: 'DEMO', name: 'Демо' });
  const board = await api<{ id: number }>('POST', '/boards', { name: 'Демо', queue_ids: [queue.id] });
  const sprints = await createSprints(api, board.id);
  const types = await api<{ id: string; key: string }[]>('GET', '/task-types?limit=200');
  const ctx: SeedContext = {
    api,
    developers: new Map(buildDemoDevelopers().map((d) => [d.id, d.email ?? d.id])),
    keys: {},
    people,
    queueId: queue.id,
    typeIds: new Map(types.map((t) => [t.key, t.id])),
  };

  const sprintTasks = buildDemoSprintTasks();
  const parents = new Map<string, string>();
  for (const parent of new Map(sprintTasks.flatMap((t) => (t.parent ? [[t.parent.key, t.parent]] : []))).values()) {
    const id = await createTask(ctx, { id: parent.key, name: parent.display, type: 'story' } as Task, null, null);
    parents.set(parent.key, id);
  }
  for (const task of sprintTasks) {
    await createTask(ctx, task, sprints.current, task.parent ? (parents.get(task.parent.key) ?? null) : null);
  }
  for (const task of buildDemoBacklogTasks()) {
    await createTask(ctx, task, null, null);
  }
  return { boardId: board.id, keys: ctx.keys, people, sprints };
}
