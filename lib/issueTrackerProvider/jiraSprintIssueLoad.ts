import type { IssueTrackerIssue, IssueTrackerSprintIssuesOptions } from './types';
import type { TrackerIssue } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { apiCache } from '@/lib/cache';
import { sprintIssuesCacheTtlSeconds } from '@/lib/trackerApi/sprintIssuesCache';

import { jiraAgileBoardSprintIssuesUrl, jiraAgileSprintIssuesUrl } from './jiraCatalog';
import { readHarvestedJiraIssueLinks } from './jiraIssueLinks';
import { collectPagedJiraRestIssues, normalizeJiraIssuesWithSchedule } from './jiraIssues';
import { postJiraIssueSearch } from './jiraIssueSearchRequest';
import { getJiraSprintBoardId } from './jiraIssueSprintMembership';

const JIRA_SPRINT_ISSUE_FIELDS = ['*all'] as const;

const inflightJiraSprintIssues = new Map<string, Promise<IssueTrackerIssue[]>>();

async function fetchPagedJiraIssueData(
  requestPage: (startAt: number, maxResults: number, nextPageToken?: string) => Promise<unknown>
): Promise<TrackerIssue[]> {
  const { issues } = await collectPagedJiraRestIssues(requestPage);
  return issues;
}

async function fetchAgileSprintIssues(
  api: AxiosInstance,
  url: string
): Promise<TrackerIssue[] | null> {
  try {
    return await fetchPagedJiraIssueData(async (startAt, maxResults) => {
      const { data } = await api.get<unknown>(url, {
        params: { fields: '*all', maxResults, startAt },
      });
      return data;
    });
  } catch {
    return null;
  }
}

function fetchJqlSprintIssues(api: AxiosInstance, sprintId: number): Promise<TrackerIssue[]> {
  return fetchPagedJiraIssueData((startAt, maxResults, nextPageToken) =>
    postJiraIssueSearch(api, {
      fields: JIRA_SPRINT_ISSUE_FIELDS,
      jql: `sprint = ${sprintId} ORDER BY Rank ASC`,
      maxResults,
      nextPageToken,
      startAt,
    })
  );
}

/**
 * Задачи спринта. С `boardId` — только те, что проходят фильтр доски: в спринт Jira может
 * попасть задача чужой доски (общий проект, другая команда), на доске она не видна.
 */
export async function searchJiraIssuesInSprint(
  api: AxiosInstance,
  sprintId: number,
  boardId?: number | null
): Promise<TrackerIssue[]> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (baseUrl && boardId != null) {
    const onBoard = await fetchAgileSprintIssues(
      api,
      jiraAgileBoardSprintIssuesUrl(baseUrl, boardId, sprintId)
    );
    if (onBoard !== null) {
      return onBoard;
    }
  }
  const agile = baseUrl
    ? await fetchAgileSprintIssues(api, jiraAgileSprintIssuesUrl(baseUrl, sprintId))
    : null;
  if (agile !== null) {
    return agile;
  }
  return fetchJqlSprintIssues(api, sprintId);
}

function jiraSprintIssuesCacheKey(api: AxiosInstance, sprintId: number): string {
  const base = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  return `jira:sprint-issues:${sprintId}:${base}`;
}

function attachHarvestedIssueLinks(
  raw: TrackerIssue[],
  normalized: IssueTrackerIssue[]
): IssueTrackerIssue[] {
  return normalized.map((issue, index) => {
    const links = readHarvestedJiraIssueLinks(raw[index]);
    if (links === undefined) {
      return issue;
    }
    return { ...issue, issueLinks: links };
  });
}

async function fetchAndCacheJiraSprintIssues(
  api: AxiosInstance,
  sprintId: number,
  cacheKey: string,
  sprintStatus: string | undefined
): Promise<IssueTrackerIssue[]> {
  const boardId = await getJiraSprintBoardId(api, sprintId);
  const found = await searchJiraIssuesInSprint(api, sprintId, boardId);
  const normalized = await normalizeJiraIssuesWithSchedule(api, found);
  const issues = attachHarvestedIssueLinks(found, normalized);
  apiCache.set(cacheKey, issues, sprintIssuesCacheTtlSeconds(sprintStatus));
  return issues;
}

/**
 * Поиск задач спринта в Jira с общим in-memory кэшем.
 * Доска параллельно зовёт tracker, score и velocity — без этого каждый делает свой search.
 */
export async function loadJiraSprintIssues(
  api: AxiosInstance,
  sprintId: number,
  options?: IssueTrackerSprintIssuesOptions
): Promise<IssueTrackerIssue[]> {
  if (options?.cacheOnly) {
    return [];
  }
  const cacheKey = jiraSprintIssuesCacheKey(api, sprintId);
  if (!options?.forceRefresh) {
    const cached = apiCache.get<IssueTrackerIssue[]>(cacheKey);
    if (cached) {
      return cached;
    }
    const pending = inflightJiraSprintIssues.get(cacheKey);
    if (pending) {
      return pending;
    }
  }
  const loading = fetchAndCacheJiraSprintIssues(api, sprintId, cacheKey, options?.sprintStatus);
  if (!options?.forceRefresh) {
    inflightJiraSprintIssues.set(cacheKey, loading);
  }
  try {
    return await loading;
  } finally {
    if (inflightJiraSprintIssues.get(cacheKey) === loading) {
      inflightJiraSprintIssues.delete(cacheKey);
    }
  }
}
