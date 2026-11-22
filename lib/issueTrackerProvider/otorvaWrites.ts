/**
 * Запись во встроенный трекер otorva: задачи, переходы, членство в спринтах, спринты, связи.
 * Статус меняется только переходом (id перехода — id целевого статуса), не правкой задачи.
 */
import type { IssueTrackerCreateIssueLinkInput, IssueTrackerIssueLink } from './issueLinkTypes';
import type { OtorvaCatalog, OtorvaSprint } from './otorvaApi';
import type {
  IssueTrackerCreateIssueInput,
  IssueTrackerCreateSprintInput,
  IssueTrackerIssuePatch,
  IssueTrackerSprintMembershipUpdateResult,
  IssueTrackerSprintRef,
  IssueTrackerSprintStatus,
} from './types';
import type { SprintInfo } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { UnsupportedIssueTrackerOperationError } from './errors';
import { fetchOtorvaPages, fetchOtorvaTaskByKey } from './otorvaApi';
import { otorvaQueueId } from './otorvaIssues';
import { otorvaSprintInfo } from './otorvaPlanning';

const DEFAULT_TYPE_KEY = 'task';

class OtorvaNotFoundError extends Error {
  readonly status = 404;
}

async function requireTaskId(api: AxiosInstance, key: string): Promise<string> {
  const task = await fetchOtorvaTaskByKey(api, key);
  if (!task) {
    throw new OtorvaNotFoundError(`Issue ${key} not found in the built-in tracker`);
  }
  return task.id;
}

/** `YYYY-MM-DD` из даты или datetime; `null` очищает поле. */
function dateOnly(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }
  return value.trim().slice(0, 10) || null;
}

async function taskTypeId(catalog: OtorvaCatalog, typeKey: string | undefined): Promise<string> {
  const types = [...(await catalog.taskTypes()).values()];
  const key = (typeKey ?? DEFAULT_TYPE_KEY).trim().toLowerCase();
  const type = types.find((t) => t.key === key) ?? types.find((t) => t.key === DEFAULT_TYPE_KEY);
  if (!type) {
    throw new OtorvaNotFoundError(`Task type ${key} not found in the built-in tracker`);
  }
  return type.id;
}

export async function createOtorvaIssue(
  api: AxiosInstance,
  catalog: OtorvaCatalog,
  input: IssueTrackerCreateIssueInput
): Promise<{ id: string; key: string }> {
  const queueId = await otorvaQueueId(catalog, input.queue);
  if (!queueId) {
    throw new OtorvaNotFoundError(`Queue ${input.queue} not found in the built-in tracker`);
  }
  const { data } = await api.post<{ id: string; key: string }>('/tasks', {
    assignee_id: input.assignee || null,
    description: input.description ?? '',
    parent_id: input.parent ? await requireTaskId(api, input.parent) : null,
    queue_id: queueId,
    task_type_id: await taskTypeId(catalog, input.type),
    title: input.summary,
  });
  if (input.sprint) {
    await api.post(`/sprints/${input.sprint}/tasks`, { task_id: data.id });
  }
  return { id: data.id, key: data.key };
}

/** Поля патча планера → тело `PUT /tasks/{id}`; `undefined` — не трогать, `null` — очистить. */
async function otorvaTaskBody(api: AxiosInstance, patch: IssueTrackerIssuePatch): Promise<Record<string, unknown>> {
  const body: Record<string, unknown> = {
    description: patch.description,
    end_date: dateOnly(patch.deadline),
    start_date: dateOnly(patch.start),
    story_points: patch.storyPoints,
    test_points: patch.testPoints,
    title: patch.summary,
  };
  if (patch.assigneeId !== undefined) {
    body.assignee_id = patch.assigneeId || null;
  }
  if (patch.parent !== undefined) {
    body.parent_id = patch.parent ? await requireTaskId(api, patch.parent) : null;
  }
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
}

export async function updateOtorvaIssue(
  api: AxiosInstance,
  key: string,
  patch: IssueTrackerIssuePatch
): Promise<unknown> {
  const id = await requireTaskId(api, key);
  const { data } = await api.put(`/tasks/${id}`, await otorvaTaskBody(api, patch));
  return data;
}

export async function transitionOtorvaIssue(api: AxiosInstance, key: string, transitionId: string): Promise<void> {
  const id = await requireTaskId(api, key);
  await api.post(`/tasks/${id}/transition`, { to_status_id: transitionId });
}

// --- Спринты ---

async function membershipResult(
  catalog: OtorvaCatalog,
  sprintIds: number[]
): Promise<IssueTrackerSprintMembershipUpdateResult> {
  const affected = [...new Set(sprintIds)];
  const sprints = await Promise.all(affected.map((id) => catalog.sprint(id)));
  const boards = [...new Set(sprints.filter((s) => s != null).map((s) => s.board_id))];
  return { affectedSprintIds: affected, backlogBoardIds: boards };
}

export async function addOtorvaIssueToSprint(
  api: AxiosInstance,
  catalog: OtorvaCatalog,
  key: string,
  sprintId: number
): Promise<IssueTrackerSprintMembershipUpdateResult> {
  const task = await fetchOtorvaTaskByKey(api, key);
  if (!task) {
    throw new OtorvaNotFoundError(`Issue ${key} not found in the built-in tracker`);
  }
  if (task.sprint_ids.includes(sprintId)) {
    return { affectedSprintIds: [], backlogBoardIds: [] };
  }
  await api.post(`/sprints/${sprintId}/tasks`, { task_id: task.id });
  return membershipResult(catalog, [...task.sprint_ids, sprintId]);
}

export async function removeOtorvaIssueFromSprint(
  api: AxiosInstance,
  catalog: OtorvaCatalog,
  key: string,
  sprintId: string
): Promise<IssueTrackerSprintMembershipUpdateResult> {
  const task = await fetchOtorvaTaskByKey(api, key);
  const id = Number(sprintId);
  if (!task || !task.sprint_ids.includes(id)) {
    return { affectedSprintIds: [], backlogBoardIds: [] };
  }
  await api.delete(`/sprints/${id}/tasks/${task.id}`);
  return membershipResult(catalog, task.sprint_ids);
}

export async function replaceOtorvaIssueSprints(
  api: AxiosInstance,
  catalog: OtorvaCatalog,
  key: string,
  sprints: IssueTrackerSprintRef[]
): Promise<IssueTrackerSprintMembershipUpdateResult> {
  const task = await fetchOtorvaTaskByKey(api, key);
  if (!task) {
    throw new OtorvaNotFoundError(`Issue ${key} not found in the built-in tracker`);
  }
  const next = sprints.map((s) => Number(s.id)).filter((id) => Number.isInteger(id) && id > 0);
  await api.put(`/tasks/${task.id}/sprints`, { sprint_ids: next });
  return membershipResult(catalog, [...task.sprint_ids, ...next]);
}

export async function createOtorvaSprint(api: AxiosInstance, input: IssueTrackerCreateSprintInput): Promise<SprintInfo> {
  const { data } = await api.post<OtorvaSprint>('/sprints', {
    board_id: input.boardId,
    end_date: dateOnly(input.endDate),
    name: input.name,
    start_date: dateOnly(input.startDate),
  });
  return otorvaSprintInfo(data);
}

export async function updateOtorvaSprintStatus(
  api: AxiosInstance,
  sprintId: number,
  status: IssueTrackerSprintStatus,
  version?: number
): Promise<SprintInfo & { boardId: number }> {
  const { data } = await api.put<OtorvaSprint>(`/sprints/${sprintId}`, { status, version });
  return { ...otorvaSprintInfo(data), boardId: data.board_id };
}

export async function updateOtorvaSprintGoal(api: AxiosInstance, sprintId: number, goal: string): Promise<void> {
  await api.put(`/sprints/${sprintId}`, { goal });
}

// --- Связи ---

/** Системный тип связи otorva «связь» — единственный, он и есть `relates`. */
async function systemLinkTypeId(api: AxiosInstance): Promise<string> {
  const { items } = await fetchOtorvaPages<{ id: string; is_system: boolean }>(api, '/link-types');
  const system = items.find((t) => t.is_system) ?? items[0];
  if (!system) {
    throw new OtorvaNotFoundError('The built-in tracker has no link types');
  }
  return system.id;
}

export async function createOtorvaIssueLink(
  api: AxiosInstance,
  key: string,
  input: IssueTrackerCreateIssueLinkInput
): Promise<IssueTrackerIssueLink> {
  if (input.relationship !== 'relates') {
    throw new UnsupportedIssueTrackerOperationError(`createIssueLink:${input.relationship}`, 'otorva');
  }
  const [from, target] = await Promise.all([fetchOtorvaTaskByKey(api, key), fetchOtorvaTaskByKey(api, input.targetIssueKey)]);
  if (!from || !target) {
    throw new OtorvaNotFoundError(`Issue ${from ? input.targetIssueKey : key} not found in the built-in tracker`);
  }
  const { data } = await api.post<{ id: string }>('/task-links', {
    from_task_id: from.id,
    link_type_id: await systemLinkTypeId(api),
    to_task_id: target.id,
  });
  return {
    direction: 'outward',
    id: data.id,
    linkedIssueKey: target.key,
    linkedSummary: target.title,
    relationship: 'relates',
  };
}

export async function deleteOtorvaIssueLink(api: AxiosInstance, linkId: string): Promise<void> {
  await api.delete(`/task-links/${linkId}`);
}
