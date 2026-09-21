import type {
  IssueTrackerIssue,
  IssueTrackerSprintMembershipUpdateResult,
  IssueTrackerSprintRef,
} from './types';
import type { AxiosInstance } from 'axios';

import {
  jiraAgileBacklogIssueUrl,
  jiraAgileSprintByIdUrl,
  jiraAgileSprintIssuesUrl,
} from './jiraCatalog';
import { fetchJiraIssue } from './jiraIssues';

function jiraRestBaseUrl(api: AxiosInstance): string {
  return typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
}

function uniqueNumbers(values: Array<number | null | undefined>): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const value of values) {
    if (value == null || !Number.isFinite(value) || value <= 0 || seen.has(value)) {
      continue;
    }
    seen.add(value);
    out.push(value);
  }
  return out;
}

function parsePositiveSprintId(raw: unknown): number | null {
  const id = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function sprintMembershipResult(
  affectedSprintIds: Array<number | null | undefined>,
  backlogBoardIds: Array<number | null | undefined>
): IssueTrackerSprintMembershipUpdateResult {
  return {
    affectedSprintIds: uniqueNumbers(affectedSprintIds),
    backlogBoardIds: uniqueNumbers(backlogBoardIds),
  };
}

export function currentJiraSprintIdsFromIssue(issue: IssueTrackerIssue | null): number[] {
  if (!issue?.sprint) {
    return [];
  }
  const sprintField = issue.sprint;
  const rows = Array.isArray(sprintField) ? sprintField : [sprintField];
  return uniqueNumbers(rows.map((row) => parsePositiveSprintId(typeof row === 'object' ? row.id : row)));
}

async function getJiraSprintBoardId(api: AxiosInstance, sprintId: number): Promise<number | null> {
  const baseUrl = jiraRestBaseUrl(api);
  if (!baseUrl) {
    return null;
  }
  try {
    const { data } = await api.get<unknown>(jiraAgileSprintByIdUrl(baseUrl, sprintId));
    if (!data || typeof data !== 'object') {
      return null;
    }
    return parsePositiveSprintId((data as { originBoardId?: unknown }).originBoardId);
  } catch {
    return null;
  }
}

async function moveJiraIssuesToSprint(
  api: AxiosInstance,
  sprintId: number,
  issueKeys: string[]
): Promise<void> {
  const baseUrl = jiraRestBaseUrl(api);
  if (!baseUrl || issueKeys.length === 0) {
    return;
  }
  await api.post(jiraAgileSprintIssuesUrl(baseUrl, sprintId), { issues: issueKeys });
}

async function moveJiraIssuesToBacklog(api: AxiosInstance, issueKeys: string[]): Promise<void> {
  const baseUrl = jiraRestBaseUrl(api);
  if (!baseUrl || issueKeys.length === 0) {
    return;
  }
  await api.post(jiraAgileBacklogIssueUrl(baseUrl), { issues: issueKeys });
}

async function loadIssueSprintIds(api: AxiosInstance, issueKey: string): Promise<number[]> {
  const issue = await fetchJiraIssue(api, issueKey.trim());
  return currentJiraSprintIdsFromIssue(issue);
}

export async function addJiraIssueToSprint(
  api: AxiosInstance,
  issueKey: string,
  sprintId: number
): Promise<IssueTrackerSprintMembershipUpdateResult> {
  const key = issueKey.trim();
  if (!key || !Number.isInteger(sprintId) || sprintId <= 0) {
    throw new Error('Jira addIssueToSprint requires issue key and positive sprint id');
  }

  const currentIds = await loadIssueSprintIds(api, key);
  if (currentIds.includes(sprintId)) {
    return sprintMembershipResult([], []);
  }

  const boardId = await getJiraSprintBoardId(api, sprintId);
  await moveJiraIssuesToSprint(api, sprintId, [key]);

  return sprintMembershipResult(
    [...currentIds, sprintId],
    boardId == null ? [] : [boardId]
  );
}

export async function removeJiraIssueFromSprint(
  api: AxiosInstance,
  issueKey: string,
  sprintIdRaw: string
): Promise<IssueTrackerSprintMembershipUpdateResult> {
  const key = issueKey.trim();
  const sprintId = parsePositiveSprintId(sprintIdRaw);
  if (!key || sprintId == null) {
    throw new Error('Jira removeIssueFromSprint requires issue key and sprint id');
  }

  const currentIds = await loadIssueSprintIds(api, key);
  const boardId = await getJiraSprintBoardId(api, sprintId);
  await moveJiraIssuesToBacklog(api, [key]);

  return sprintMembershipResult(
    [sprintId, ...currentIds.filter((id) => id !== sprintId)],
    boardId == null ? [] : [boardId]
  );
}

function parseReplaceSprintIds(sprints: IssueTrackerSprintRef[]): number[] {
  return uniqueNumbers(sprints.map((sprint) => parsePositiveSprintId(sprint.id)));
}

export async function replaceJiraIssueSprints(
  api: AxiosInstance,
  issueKey: string,
  sprints: IssueTrackerSprintRef[]
): Promise<IssueTrackerSprintMembershipUpdateResult> {
  const key = issueKey.trim();
  if (!key) {
    throw new Error('Jira replaceIssueSprints requires issue key');
  }

  const currentIds = await loadIssueSprintIds(api, key);
  const nextIds = parseReplaceSprintIds(sprints);

  if (nextIds.length === 0) {
    await moveJiraIssuesToBacklog(api, [key]);
  } else {
    await moveJiraIssuesToSprint(api, nextIds[nextIds.length - 1]!, [key]);
  }

  const affectedIds = uniqueNumbers([...currentIds, ...nextIds]);
  const boardIds = await Promise.all(affectedIds.map((id) => getJiraSprintBoardId(api, id)));
  return sprintMembershipResult(affectedIds, boardIds);
}
