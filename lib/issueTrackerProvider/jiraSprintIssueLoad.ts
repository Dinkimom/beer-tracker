import type { IssueTrackerIssue, IssueTrackerSprintIssuesOptions } from './types';
import type { TrackerIssue } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { apiCache } from '@/lib/cache';
import { sprintIssuesCacheTtlSeconds } from '@/lib/trackerApi/sprintIssuesCache';

import { readHarvestedJiraIssueLinks } from './jiraIssueLinks';
import { normalizeJiraIssuesWithSchedule, searchJiraIssuesInSprint } from './jiraIssues';

const inflightJiraSprintIssues = new Map<string, Promise<IssueTrackerIssue[]>>();

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
  const found = await searchJiraIssuesInSprint(api, sprintId);
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
