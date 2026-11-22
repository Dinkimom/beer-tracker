/**
 * HTTP-слой встроенного трекера otorva: DTO ответов `…/api/v1`, постраничная выборка и
 * справочники (типы, статусы, люди, очереди, спринты), которые клиент грузит лениво
 * один раз на свою жизнь (запрос API планера).
 */
import type { AxiosInstance } from 'axios';

import axios from 'axios';

const OTORVA_REQUEST_TIMEOUT_MS = 15_000;
/** Максимум otorva на страницу (`MAX_LIMIT`). */
const OTORVA_PAGE_SIZE = 200;

export interface OtorvaTask {
  assignee_id: string | null;
  created_at: string;
  description: string;
  end_date: string | null;
  id: string;
  key: string;
  parent_id: string | null;
  queue_id: string;
  sprint_ids?: number[];
  start_date: string | null;
  status_id: string;
  story_points: number | null;
  task_type_id: string;
  test_points: number | null;
  title: string;
  updated_at: string;
}

interface OtorvaTaskLink {
  from_task_id: string;
  id: string;
  link_type_id: string;
  to_task_id: string;
}

interface OtorvaStatusBrief {
  /** Категория статуса otorva (ждёт / в работе / готово) — как statusType Яндекс Трекера. */
  category?: string;
  id: string;
  is_initial: boolean;
  is_terminal: boolean;
  name: string;
  sort_order: number;
  workflow_id: string;
}

interface OtorvaTaskDetail extends OtorvaTask {
  available_transitions: OtorvaStatusBrief[];
  links: OtorvaTaskLink[];
  sprint_ids: number[];
}

export interface OtorvaProfile {
  email?: string;
  first_name: string;
  id: string;
  is_admin: boolean;
  last_name: string;
  photo: string | null;
}

interface OtorvaQueue {
  id: string;
  key: string;
  name: string;
}

export interface OtorvaBoard {
  id: number;
  name: string;
  queue_ids?: string[];
}

export interface OtorvaSprint {
  author_id: string | null;
  board_id: number;
  created_at: string;
  end_date: string;
  goal: string;
  id: number;
  name: string;
  start_date: string;
  status: string;
  version: number;
}

interface OtorvaEventRef {
  display: string;
  id: string;
}

export interface OtorvaEvent {
  author: OtorvaEventRef | null;
  changes: Array<{ field: string; from: unknown; to: unknown }>;
  created_at: string;
  id: number;
  kind: string;
  task_key: string;
}

interface OtorvaTaskType {
  id: string;
  key: string;
  name: string;
}

interface OtorvaWorkflowDetail {
  statuses: OtorvaStatusBrief[];
  task_type_id: string;
}

/** Статус в справочнике: ключ — название в нижнем регистре (одинаково во всех воркфлоу). */
export interface OtorvaStatusInfo extends OtorvaStatusBrief {
  key: string;
  typeKey: 'done' | 'inProgress' | 'new';
}

export function otorvaStatusKey(name: string): string {
  return name.trim().toLowerCase();
}

const STATUS_TYPE_BY_CATEGORY: Readonly<Record<string, OtorvaStatusInfo['typeKey']>> = {
  done: 'done',
  in_progress: 'inProgress',
  todo: 'new',
};

/** Тип статуса для планера — по категории otorva; без неё (старый otorva) — по флагам. */
function otorvaStatusTypeKey(
  status: Pick<OtorvaStatusBrief, 'category' | 'is_initial' | 'is_terminal'>
): OtorvaStatusInfo['typeKey'] {
  const byCategory = status.category ? STATUS_TYPE_BY_CATEGORY[status.category] : undefined;
  if (byCategory) {
    return byCategory;
  }
  if (status.is_terminal) {
    return 'done';
  }
  return status.is_initial ? 'new' : 'inProgress';
}

export function otorvaProfileName(profile: Pick<OtorvaProfile, 'first_name' | 'last_name'>): string {
  return `${profile.first_name} ${profile.last_name}`.trim();
}

export function createOtorvaAxiosInstance(apiUrl: string, token: string): AxiosInstance {
  return axios.create({
    baseURL: apiUrl,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: OTORVA_REQUEST_TIMEOUT_MS,
  });
}

/** Все страницы списка (или до `maxItems`); `truncated` — дальше ещё есть. */
export async function fetchOtorvaPages<T>(
  api: AxiosInstance,
  path: string,
  params: Record<string, unknown> = {},
  maxItems = Number.POSITIVE_INFINITY
): Promise<{ items: T[]; truncated: boolean }> {
  const items: T[] = [];
  while (items.length < maxItems) {
    const { data } = await api.get<T[]>(path, {
      params: { ...params, limit: OTORVA_PAGE_SIZE, offset: items.length },
    });
    items.push(...data);
    if (data.length < OTORVA_PAGE_SIZE) {
      return { items: items.slice(0, maxItems), truncated: false };
    }
  }
  return { items: items.slice(0, maxItems), truncated: true };
}

export async function fetchOtorvaTaskByKey(api: AxiosInstance, key: string): Promise<OtorvaTaskDetail | null> {
  try {
    const { data } = await api.get<OtorvaTaskDetail>(`/tasks/by-key/${encodeURIComponent(key)}`);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

function memo<T>(load: () => Promise<T>): () => Promise<T> {
  let cached: Promise<T> | null = null;
  return () => {
    cached ??= load().catch((error: unknown) => {
      cached = null;
      throw error;
    });
    return cached;
  };
}

async function loadStatuses(api: AxiosInstance): Promise<Map<string, OtorvaStatusInfo>> {
  const { items } = await fetchOtorvaPages<{ id: string }>(api, '/workflows');
  const details = await Promise.all(
    items.map((w) => api.get<OtorvaWorkflowDetail>(`/workflows/${w.id}`).then((r) => r.data))
  );
  const byId = new Map<string, OtorvaStatusInfo>();
  for (const status of details.flatMap((d) => d.statuses)) {
    byId.set(status.id, { ...status, key: otorvaStatusKey(status.name), typeKey: otorvaStatusTypeKey(status) });
  }
  return byId;
}

/** Справочники трекера на время жизни клиента: грузятся при первом обращении. */
export function createOtorvaCatalog(api: AxiosInstance) {
  const sprintById = new Map<number, Promise<OtorvaSprint | null>>();
  const taskById = new Map<string, Promise<OtorvaTask | null>>();
  return {
    profiles: memo(async () => {
      const { items } = await fetchOtorvaPages<OtorvaProfile>(api, '/profiles');
      return new Map(items.map((p) => [p.id, p]));
    }),
    queues: memo(async () => (await fetchOtorvaPages<OtorvaQueue>(api, '/queues')).items),
    sprint(id: number): Promise<OtorvaSprint | null> {
      let pending = sprintById.get(id);
      if (!pending) {
        pending = api
          .get<OtorvaSprint>(`/sprints/${id}`)
          .then((r) => r.data)
          .catch(() => null);
        sprintById.set(id, pending);
      }
      return pending;
    },
    statuses: memo(() => loadStatuses(api)),
    /** Задача вне текущей выборки (родитель, связанная задача); `null` — удалена. */
    task(id: string): Promise<OtorvaTask | null> {
      let pending = taskById.get(id);
      if (!pending) {
        pending = api
          .get<OtorvaTask>(`/tasks/${id}`)
          .then((r) => r.data)
          .catch(() => null);
        taskById.set(id, pending);
      }
      return pending;
    },
    taskTypes: memo(async () => {
      const { items } = await fetchOtorvaPages<OtorvaTaskType>(api, '/task-types');
      return new Map(items.map((t) => [t.id, t]));
    }),
  };
}

export type OtorvaCatalog = ReturnType<typeof createOtorvaCatalog>;
