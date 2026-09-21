/**
 * API работы с задачами Tracker: чеклист, переходы, статусы, спринты, changelog, создание.
 */

import type { RegistryUserItem, TransitionField, TransitionItem } from './types';
import type { IssueResponse, Task } from '@/types';
import type { IssueChangelogWithComments } from '@/types/tracker';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

function isStructuredIssueChangelogPayload(data: unknown): data is IssueChangelogWithComments {
  return data != null && typeof data === 'object' && 'changelog' in data && 'comments' in data;
}

function normalizeIssueChangelogResponse(data: unknown): IssueChangelogWithComments {
  if (!isStructuredIssueChangelogPayload(data)) {
    return {
      changelog: Array.isArray(data) ? data : [],
      comments: [],
    };
  }
  return {
    changelog: Array.isArray(data.changelog) ? data.changelog : [],
    comments: Array.isArray(data.comments) ? data.comments : [],
  };
}

export async function updateChecklistItem(
  issueKey: string,
  checklistItemId: string,
  checked: boolean
): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().patch(
      `/issues/${issueKey}/checklist/${checklistItemId}`,
      { checked }
    );
    return true;
  } catch (error) {
    console.error(`Failed to update checklist item for ${issueKey}:`, error);
    return false;
  }
}

export async function getIssue(issueKey: string): Promise<IssueResponse | null> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get(`/issues/${issueKey}`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch issue ${issueKey}:`, error);
    return null;
  }
}

/** Задача в формате Task для карточки (тултип колбасы и т.п.) */
export async function getTaskByKey(issueKey: string): Promise<Task | null> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<Task>(`/issues/${issueKey}/task`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch task ${issueKey}:`, error);
    return null;
  }
}

/** Обновить или снять родительскую задачу в Tracker (`null` — без родителя). */
export async function updateIssueParent(
  issueKey: string,
  parentKey: string | null,
  sprintId?: number | null
): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().patch(`/issues/${issueKey}`, {
      parent: parentKey,
      ...(sprintId ? { sprintId } : {}),
    });
    return true;
  } catch (error) {
    console.error(`Failed to update parent for ${issueKey}:`, error);
    return false;
  }
}

/** Обновить summary/description задачи в Tracker. */
export async function updateIssueFields(
  issueKey: string,
  fields: { description?: string; summary?: string }
): Promise<boolean> {
  const body: { description?: string; summary?: string } = {};
  if (fields.summary !== undefined) {
    body.summary = fields.summary;
  }
  if (fields.description !== undefined) {
    body.description = fields.description;
  }
  if (Object.keys(body).length === 0) {
    return true;
  }
  try {
    await getPlannerBeerTrackerApi().patch(`/issues/${issueKey}`, body);
    return true;
  } catch (error) {
    console.error(`Failed to update fields for ${issueKey}:`, error);
    return false;
  }
}

export async function getIssueTransitions(issueKey: string): Promise<TransitionItem[]> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get(`/issues/${issueKey}/transitions`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch transitions for ${issueKey}:`, error);
    return [];
  }
}

export async function searchUsers(query: string): Promise<RegistryUserItem[]> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<{ items: RegistryUserItem[] }>(
      `/users/search?q=${encodeURIComponent(query)}`
    );
    return data?.items ?? [];
  } catch (error) {
    console.error('Failed to search users:', error);
    return [];
  }
}

export async function getUserByTrackerId(trackerId: string): Promise<RegistryUserItem | null> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<RegistryUserItem>(`/users/${encodeURIComponent(trackerId)}`);
    return data ?? null;
  } catch {
    return null;
  }
}

export async function getIssueTransitionsBatch(
  issueKeys: string[]
): Promise<Record<string, TransitionItem[]>> {
  if (issueKeys.length === 0) return {};
  try {
    const { data } = await getPlannerBeerTrackerApi().post<Record<string, TransitionItem[]>>(
      '/issues/transitions/batch',
      { issueKeys }
    );
    return data ?? {};
  } catch (error) {
    console.error('Failed to fetch transitions batch:', error);
    return {};
  }
}

export async function fetchQueueWorkflowScreens(
  queueKey: string
): Promise<Record<string, Record<string, TransitionField[]>>> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<Record<string, Record<string, TransitionField[]>>>(
      `/queues/${queueKey}/workflow-screens`
    );
    return data ?? {};
  } catch (error) {
    console.error(`Failed to fetch workflow screens for ${queueKey}:`, error);
    return {};
  }
}

export async function fetchScreenFields(screenId: string): Promise<TransitionField[]> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<{ fields: TransitionField[] }>(
      `/screens/${screenId}/fields`
    );
    return data?.fields ?? [];
  } catch (error) {
    console.error(`Failed to fetch screen fields ${screenId}:`, error);
    return [];
  }
}

export async function getTransitionFields(
  issueKey: string,
  transitionId: string
): Promise<TransitionField[]> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<{ fields: TransitionField[] }>(
      `/issues/${issueKey}/transitions/${transitionId}/fields`
    );
    return data?.fields ?? [];
  } catch (error) {
    console.error(`Failed to fetch transition fields for ${issueKey}:`, error);
    return [];
  }
}

export async function changeIssueStatus(
  issueKey: string,
  transitionId: string,
  resolution?: string,
  extraFields?: Record<string, unknown>,
  targetStatusKey?: string
): Promise<boolean> {
  try {
    const body: Record<string, unknown> = { transitionId };
    if (resolution !== undefined) body.resolution = resolution;
    if (extraFields && typeof extraFields === 'object') {
      Object.assign(body, extraFields);
    }
    if (targetStatusKey) {
      body.targetStatusKey = targetStatusKey;
    }
    await getPlannerBeerTrackerApi().patch(`/issues/${issueKey}/status`, body);
    return true;
  } catch (error) {
    console.error(`Failed to change status for ${issueKey}:`, error);
    return false;
  }
}

function buildUpdateIssueWorkBody(
  storyPoints?: number | null,
  testPoints?: number | null
): Record<string, number> | null {
  const body: Record<string, number> = {};
  if (storyPoints !== undefined && storyPoints !== null) body.storyPoints = storyPoints;
  if (testPoints !== undefined && testPoints !== null) body.testPoints = testPoints;
  return Object.keys(body).length > 0 ? body : null;
}

export async function updateIssueWork(
  issueKey: string,
  storyPoints?: number | null,
  testPoints?: number | null
): Promise<boolean> {
  const body = buildUpdateIssueWorkBody(storyPoints, testPoints);
  if (!body) {
    return true;
  }
  try {
    await getPlannerBeerTrackerApi().patch(`/issues/${issueKey}/update-work`, body);
    return true;
  } catch (error) {
    console.error(`Failed to update work for ${issueKey}:`, error);
    return false;
  }
}

/**
 * Обновление оценки по флагу фазы: для QA — только testPoints, для dev — только storyPoints.
 * Используется при переоценке по ресайзу/перетаскиванию фазы в занятости.
 * Для QA-фазы в body передаётся только testPoints (никогда storyPoints).
 */
export async function updateIssueWorkForPhase(
  issueKey: string,
  duration: number,
  isQa: boolean
): Promise<boolean> {
  const body: Record<string, number> =
    isQa === true ? { testPoints: duration } : { storyPoints: duration };
  try {
    await getPlannerBeerTrackerApi().patch(`/issues/${issueKey}/update-work`, body);
    return true;
  } catch (error) {
    console.error(`Failed to update work for ${issueKey}:`, error);
    return false;
  }
}

export async function createRelatedIssue(
  sourceIssueKey: string,
  data: {
    assignee?: string;
    functionalTeam?: string;
    parent?: string;
    priority?: string;
    productTeam?: string[];
    sprintId?: number | null;
    stage?: string;
    storyPoints?: number | null;
    team?: string;
    testPoints?: number | null;
    title: string;
    type?: string;
  }
): Promise<{ error?: string; issue?: { key: string }; success: boolean }> {
  try {
    const { data: result } = await getPlannerBeerTrackerApi().post(
      `/issues/${sourceIssueKey}/create-related`,
      {
        ...data,
        sprintId: data.sprintId ?? undefined,
        storyPoints: data.storyPoints ?? undefined,
        testPoints: data.testPoints ?? undefined,
      }
    );
    return { success: true, issue: result.issue };
  } catch (error) {
    console.error(`Failed to create related issue for ${sourceIssueKey}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function addIssueToSprint(issueKey: string, sprintId: number): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().post(`/issues/${issueKey}/sprint`, { sprintId });
    return true;
  } catch (error) {
    console.error(`Failed to add issue ${issueKey} to sprint ${sprintId}:`, error);
    return false;
  }
}

export async function removeIssueFromSprint(
  issueKey: string,
  sprintId: number
): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().delete(`/issues/${issueKey}/sprint?sprintId=${sprintId}`);
    return true;
  } catch (error) {
    console.error(`Failed to remove issue ${issueKey} from sprint ${sprintId}:`, error);
    return false;
  }
}

export async function removeIssueFromAllSprints(issueKey: string): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().patch(`/issues/${issueKey}/sprint`, { sprint: [] });
    return true;
  } catch (error) {
    console.error(`Failed to remove issue ${issueKey} from all sprints:`, error);
    return false;
  }
}

export async function fetchIssueChangelog(
  issueKey: string
): Promise<IssueChangelogWithComments> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<IssueChangelogWithComments>(
      `/issues/${issueKey}/changelog`
    );
    return normalizeIssueChangelogResponse(data);
  } catch (error) {
    console.error(`Failed to fetch changelog for ${issueKey}:`, error);
    return { changelog: [], comments: [] };
  }
}

interface IssueSearchResultItem {
  key: string;
  summary: string;
  task: Task;
}

export async function searchIssues(
  query: string,
  boardId: number,
  options?: { parentCandidates?: boolean }
): Promise<IssueSearchResultItem[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      boardId: String(boardId),
    });
    if (options?.parentCandidates) {
      params.set('parentCandidates', '1');
    }
    const { data } = await getPlannerBeerTrackerApi().get<{ items: IssueSearchResultItem[] }>(
      `/issues/search?${params.toString()}`
    );
    return data?.items ?? [];
  } catch (error) {
    console.error('Failed to search issues:', error);
    return [];
  }
}

export async function createIssue(issueData: {
  assignee?: string;
  description?: string;
  parent?: string;
  priority?: string;
  queue: string;
  sprintId?: number;
  summary: string;
  type?: string;
}): Promise<{ error?: string; key?: string; success: boolean; task?: Task }> {
  try {
    const { data } = await getPlannerBeerTrackerApi().post('/issues', issueData);
    return {
      success: true,
      key: data.key,
      task: data.task,
    };
  } catch (error) {
    console.error('Failed to create issue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
