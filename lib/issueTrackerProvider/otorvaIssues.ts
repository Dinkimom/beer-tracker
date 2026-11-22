/**
 * Задачи встроенного трекера otorva в нейтральной форме провайдера: маппинг `OtorvaTask` →
 * `IssueTrackerIssue`, выборки, переходы, журнал (→ changelog) и связи.
 */
import type { IssueTrackerIssueLink } from './issueLinkTypes';
import type { OtorvaCatalog, OtorvaEvent, OtorvaTask } from './otorvaApi';
import type { IssueTrackerIssue } from './types';
import type { ChangelogEntry, IssueChangelogWithComments } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { fetchOtorvaPages, fetchOtorvaTaskByKey, otorvaProfileName, otorvaStatusKey } from './otorvaApi';

/** Ключей в одном запросе журнала (`MAX_EVENT_KEYS` otorva). */
const EVENT_KEYS_CHUNK = 200;
const EPIC_TYPE_KEY = 'epic';

type IssueRef = NonNullable<IssueTrackerIssue['parent']>;

async function resolveParents(catalog: OtorvaCatalog, tasks: OtorvaTask[]): Promise<Map<string, IssueRef>> {
  const inList = new Map(tasks.map((t) => [t.id, t]));
  const parentIds = [...new Set(tasks.map((t) => t.parent_id).filter((id): id is string => id != null))];
  const parents = await Promise.all(parentIds.map(async (id) => inList.get(id) ?? (await catalog.task(id))));
  const refs = new Map<string, IssueRef>();
  for (const parent of parents) {
    if (parent) {
      refs.set(parent.id, { display: parent.title, id: parent.id, key: parent.key });
    }
  }
  return refs;
}

async function resolveSprintNames(catalog: OtorvaCatalog, tasks: OtorvaTask[]): Promise<Map<number, string>> {
  const ids = [...new Set(tasks.flatMap((t) => t.sprint_ids ?? []))];
  const sprints = await Promise.all(ids.map((id) => catalog.sprint(id)));
  return new Map(sprints.filter((s) => s != null).map((s) => [s.id, s.name]));
}

/** Пачка задач otorva → задачи провайдера; справочники и родители — общими запросами на пачку. */
async function otorvaTasksToIssues(
  catalog: OtorvaCatalog,
  tasks: OtorvaTask[]
): Promise<IssueTrackerIssue[]> {
  const [statuses, types, profiles, queues, parents, sprintNames] = await Promise.all([
    catalog.statuses(),
    catalog.taskTypes(),
    catalog.profiles(),
    catalog.queues(),
    resolveParents(catalog, tasks),
    resolveSprintNames(catalog, tasks),
  ]);
  const queueById = new Map(queues.map((q) => [q.id, q]));
  return tasks.map((task) => {
    const status = statuses.get(task.status_id);
    const type = types.get(task.task_type_id);
    const assignee = task.assignee_id ? profiles.get(task.assignee_id) : undefined;
    const queue = queueById.get(task.queue_id);
    return {
      assignee: assignee ? { display: otorvaProfileName(assignee), id: assignee.id } : undefined,
      createdAt: task.created_at,
      customFields: queue ? { queue: { display: queue.name, id: queue.id, key: queue.key } } : {},
      deadline: task.end_date ?? undefined,
      description: task.description,
      id: task.id,
      key: task.key,
      parent: task.parent_id ? parents.get(task.parent_id) : undefined,
      provider: 'otorva',
      raw: task,
      sprint: (task.sprint_ids ?? []).map((id) => ({ display: sprintNames.get(id) ?? String(id), id: String(id) })),
      start: task.start_date ?? undefined,
      status: status ? { display: status.name, id: status.id, key: status.key } : undefined,
      statusType: status ? { display: status.typeKey, key: status.typeKey } : undefined,
      storyPoints: task.story_points ?? undefined,
      summary: task.title,
      testPoints: task.test_points ?? undefined,
      type: type ? { display: type.name, key: type.key } : undefined,
      updatedAt: task.updated_at,
    };
  });
}

export async function getOtorvaIssue(
  api: AxiosInstance,
  catalog: OtorvaCatalog,
  key: string
): Promise<IssueTrackerIssue | null> {
  const task = await fetchOtorvaTaskByKey(api, key);
  return task ? (await otorvaTasksToIssues(catalog, [task]))[0] ?? null : null;
}

/** `GET /tasks` с фильтрами; `maxItems` — потолок выборки, `truncated` — дальше ещё есть. */
export async function listOtorvaIssues(
  api: AxiosInstance,
  catalog: OtorvaCatalog,
  params: Record<string, unknown>,
  maxItems?: number
): Promise<{ issues: IssueTrackerIssue[]; truncated: boolean }> {
  const { items, truncated } = await fetchOtorvaPages<OtorvaTask>(api, '/tasks', params, maxItems);
  return { issues: await otorvaTasksToIssues(catalog, items), truncated };
}

export async function otorvaQueueId(catalog: OtorvaCatalog, queueKey: string): Promise<string | null> {
  const key = queueKey.trim().toUpperCase();
  return (await catalog.queues()).find((q) => q.key === key)?.id ?? null;
}

/** Задачи спринта без эпиков: эпики живут на роадмапе, не на доске спринта. */
export function withoutEpics(issues: IssueTrackerIssue[]): IssueTrackerIssue[] {
  return issues.filter((issue) => issue.type?.key !== EPIC_TYPE_KEY);
}

export async function getOtorvaIssueTransitions(api: AxiosInstance, catalog: OtorvaCatalog, key: string) {
  const [task, statuses] = await Promise.all([fetchOtorvaTaskByKey(api, key), catalog.statuses()]);
  return (task?.available_transitions ?? []).map((target) => {
    const status = statuses.get(target.id);
    const statusKey = otorvaStatusKey(target.name);
    // Переход otorva задаётся целевым статусом: его id и есть id перехода.
    return {
      display: target.name,
      id: target.id,
      to: { display: target.name, id: target.id, key: statusKey, statusTypeKey: status?.typeKey },
    };
  });
}

// --- Журнал → changelog ---

/** Поля журнала otorva → id полей, как их понимают история и сгорание планера. */
const CHANGELOG_FIELD_IDS: Readonly<Record<string, string>> = {
  assignee: 'assignee',
  description: 'description',
  end_date: 'deadline',
  parent: 'parent',
  sprints: 'sprint',
  start_date: 'start',
  status: 'status',
  story_points: 'storyPoints',
  test_points: 'testPoints',
  title: 'summary',
};

interface ChangelogEndpoint { display: string; id: string; key: string }

function scalarEndpoint(value: unknown): ChangelogEndpoint {
  const text = String(value);
  return { display: text, id: text, key: text };
}

function refEndpoint(value: { display?: unknown; id?: unknown }, field: string): ChangelogEndpoint {
  const id = String(value.id ?? '');
  const display = String(value.display ?? id);
  // Статус в changelog узнаётся по ключу — тому же, что в справочнике статусов.
  return { display, id, key: field === 'status' ? otorvaStatusKey(display) : id };
}

function changelogEndpoint(value: unknown, field: string): ChangelogEndpoint | ChangelogEndpoint[] | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map((item) => refEndpoint(item as { display?: unknown; id?: unknown }, field));
  }
  if (typeof value === 'object') {
    return refEndpoint(value as { display?: unknown; id?: unknown }, field);
  }
  return scalarEndpoint(value);
}

function otorvaEventToChangelogEntry(event: OtorvaEvent): ChangelogEntry {
  return {
    createdBy: event.author ? { display: event.author.display, id: event.author.id } : undefined,
    fields: event.changes.map((change) => {
      const id = CHANGELOG_FIELD_IDS[change.field] ?? change.field;
      return {
        field: { display: id, id },
        from: changelogEndpoint(change.from, change.field),
        to: changelogEndpoint(change.to, change.field),
      };
    }),
    id: String(event.id),
    type: event.kind,
    updatedAt: event.created_at,
  } as ChangelogEntry;
}

export async function getOtorvaChangelogBatch(
  api: AxiosInstance,
  keys: string[]
): Promise<Record<string, IssueChangelogWithComments>> {
  const result: Record<string, IssueChangelogWithComments> = {};
  const unique = [...new Set(keys.map((k) => k.trim().toUpperCase()).filter(Boolean))];
  for (const key of unique) {
    result[key] = { changelog: [], comments: [] };
  }
  for (let i = 0; i < unique.length; i += EVENT_KEYS_CHUNK) {
    const chunk = unique.slice(i, i + EVENT_KEYS_CHUNK);
    const { items } = await fetchOtorvaPages<OtorvaEvent>(api, '/task-events', { keys: chunk.join(',') });
    for (const event of items) {
      result[event.task_key]?.changelog.push(otorvaEventToChangelogEntry(event));
    }
  }
  return result;
}

// --- Связи ---

export async function listOtorvaIssueLinks(
  api: AxiosInstance,
  catalog: OtorvaCatalog,
  key: string
): Promise<IssueTrackerIssueLink[]> {
  const [task, statuses] = await Promise.all([fetchOtorvaTaskByKey(api, key), catalog.statuses()]);
  if (!task) {
    return [];
  }
  const links = await Promise.all(
    task.links.map(async (link): Promise<IssueTrackerIssueLink | null> => {
      const outward = link.from_task_id === task.id;
      const linked = await catalog.task(outward ? link.to_task_id : link.from_task_id);
      if (!linked) {
        return null;
      }
      // В otorva один системный тип связи «связь» — это `relates`.
      return {
        direction: outward ? 'outward' : 'inward',
        id: link.id,
        linkedIssueKey: linked.key,
        linkedStatus: statuses.get(linked.status_id)?.key ?? null,
        linkedSummary: linked.title,
        relationship: 'relates',
      };
    })
  );
  return links.filter((link) => link != null);
}
