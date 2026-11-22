/**
 * Справочники и планирование встроенного трекера otorva в формах контракта провайдера:
 * текущий пользователь, люди, очереди, статусы, доски с колонками, спринты.
 */
import type { OtorvaBoard, OtorvaCatalog, OtorvaProfile, OtorvaSprint, OtorvaStatusInfo } from './otorvaApi';
import type { IssueTrackerStatusCatalogItem, IssueTrackerUser } from './types';
import type { BoardParams, SprintInfo, SprintListItem } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { fetchOtorvaPages, otorvaMyself, otorvaProfileName } from './otorvaApi';

export async function getOtorvaCurrentUser(api: AxiosInstance) {
  const { data } = await api.get<OtorvaProfile & { email: string }>('/auth/me');
  return otorvaMyself(data);
}

function toTrackerUser(profile: OtorvaProfile): IssueTrackerUser {
  return { avatarUrl: profile.photo, displayName: otorvaProfileName(profile), email: null, trackerId: profile.id };
}

export async function searchOtorvaUsers(catalog: OtorvaCatalog, query: string): Promise<IssueTrackerUser[]> {
  const needle = query.trim().toLowerCase();
  const people = [...(await catalog.profiles()).values()];
  return people.filter((p) => otorvaProfileName(p).toLowerCase().includes(needle)).map(toTrackerUser);
}

export async function listOtorvaQueues(catalog: OtorvaCatalog) {
  return (await catalog.queues()).map((q) => ({ key: q.key, name: q.name }));
}

export async function searchOtorvaQueues(catalog: OtorvaCatalog, query: string) {
  const needle = query.trim().toLowerCase();
  return (await listOtorvaQueues(catalog)).filter(
    (q) => q.key.toLowerCase().includes(needle) || q.name.toLowerCase().includes(needle)
  );
}

/** Типы задач otorva общие для всех очередей: одна группа на очередь. */
export async function getOtorvaQueueWorkflows(catalog: OtorvaCatalog) {
  const types = [...(await catalog.taskTypes()).values()];
  return { default: types.map((t) => ({ display: t.name, id: t.id, key: t.key })) };
}

/** Статусы по ключу, в порядке воркфлоу: у всех типов задач они называются одинаково. */
function uniqueStatusesByKey(statuses: Map<string, OtorvaStatusInfo>): OtorvaStatusInfo[] {
  const byKey = new Map<string, OtorvaStatusInfo>();
  const ordered = [...statuses.values()].sort((a, b) => a.sort_order - b.sort_order);
  for (const status of ordered) {
    if (!byKey.has(status.key)) {
      byKey.set(status.key, status);
    }
  }
  return [...byKey.values()];
}

export async function listOtorvaStatuses(catalog: OtorvaCatalog): Promise<IssueTrackerStatusCatalogItem[]> {
  return uniqueStatusesByKey(await catalog.statuses()).map((s) => ({
    id: s.id,
    key: s.key,
    statusType: { key: s.typeKey },
  }));
}

export async function listOtorvaBoards(api: AxiosInstance) {
  const { items } = await fetchOtorvaPages<OtorvaBoard>(api, '/boards');
  return items.map((b) => ({ id: b.id, name: b.name }));
}

/** Доска с колонками: колонка на статус, в порядке воркфлоу. */
export async function getOtorvaBoard(
  api: AxiosInstance,
  catalog: OtorvaCatalog,
  boardId: number
): Promise<BoardParams> {
  const [{ data: board }, statuses] = await Promise.all([
    api.get<OtorvaBoard>(`/boards/${boardId}`),
    catalog.statuses(),
  ]);
  return {
    columns: uniqueStatusesByKey(statuses).map((s) => ({ display: s.name, id: s.key, statusKeys: [s.key] })),
    id: board.id,
    name: board.name,
    self: '',
  };
}

function dayStart(date: string): string {
  return `${date}T00:00:00.000Z`;
}

export function otorvaSprintInfo(sprint: OtorvaSprint): SprintInfo {
  return {
    endDate: sprint.end_date,
    endDateTime: dayStart(sprint.end_date),
    id: sprint.id,
    name: sprint.name,
    startDate: sprint.start_date,
    startDateTime: dayStart(sprint.start_date),
    status: sprint.status,
    version: sprint.version,
  };
}

function sprintListItem(sprint: OtorvaSprint, board: OtorvaBoard, author: OtorvaProfile | undefined): SprintListItem {
  return {
    ...otorvaSprintInfo(sprint),
    version: sprint.version,
    archived: sprint.status === 'archived',
    board: { display: board.name, id: String(board.id), self: '' },
    createdAt: sprint.created_at,
    createdBy: {
      cloudUid: '',
      display: author ? otorvaProfileName(author) : '',
      id: sprint.author_id ?? '',
      passportUid: 0,
      self: '',
    },
    self: '',
  };
}

export async function listOtorvaSprints(
  api: AxiosInstance,
  catalog: OtorvaCatalog,
  boardId: number
): Promise<SprintListItem[]> {
  const [{ data: board }, { items }, profiles] = await Promise.all([
    api.get<OtorvaBoard>(`/boards/${boardId}`),
    fetchOtorvaPages<OtorvaSprint>(api, `/boards/${boardId}/sprints`),
    catalog.profiles(),
  ]);
  return items.map((s) => sprintListItem(s, board, s.author_id ? profiles.get(s.author_id) : undefined));
}

export async function getOtorvaSprint(api: AxiosInstance, sprintId: number): Promise<SprintInfo> {
  const { data } = await api.get<OtorvaSprint>(`/sprints/${sprintId}`);
  return otorvaSprintInfo(data);
}
