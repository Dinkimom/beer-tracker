import type { TrackerIssue } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { fetchJiraBoardProjectKey, jiraAgileBoardIssuesUrl } from './jiraCatalog';
import { collectPagedJiraRestIssues } from './jiraIssues';
import {
  buildJiraBoardScopeJql,
  buildJiraQueueScopeJql,
  buildJiraUpdatedRangeJql,
} from './jiraIssueSearchJql';
import { countJiraCloudIssues, postJiraIssueSearch } from './jiraIssueSearchRequest';

const JIRA_LIST_FIELDS = ['*all'] as const;
const JIRA_LIST_PAGE_CAP = 100;

function clampJiraListPerPage(perPage?: number): number {
  return Math.min(Math.max(perPage ?? 50, 1), JIRA_LIST_PAGE_CAP);
}

function collectJiraJqlIssues(
  api: AxiosInstance,
  jql: string,
  options: {
    maxResults: number;
    maxTotal: number;
    onCheckpoint?: (info: {
      page: number;
      totalIssues: number;
      totalPages: number;
    }) => Promise<void> | void;
  }
): Promise<{ issues: TrackerIssue[]; truncated: boolean }> {
  return countJiraCloudIssues(api, jql).then((issueTotal) =>
    collectPagedJiraRestIssues(
      (startAt, maxResults, nextPageToken) =>
        postJiraSearchPage(api, jql, startAt, maxResults, nextPageToken),
      {
        issueTotal: issueTotal ?? undefined,
        maxResults: options.maxResults,
        maxTotal: options.maxTotal,
        onCheckpoint: options.onCheckpoint,
      }
    )
  );
}

function postJiraSearchPage(
  api: AxiosInstance,
  jql: string,
  startAt: number,
  maxResults: number,
  nextPageToken?: string
): Promise<unknown> {
  return postJiraIssueSearch(api, {
    fields: JIRA_LIST_FIELDS,
    jql,
    maxResults,
    nextPageToken,
    startAt,
  });
}

async function fetchAgileBoardIssuePages(
  api: AxiosInstance,
  boardId: number,
  options: {
    maxTotal: number;
    perPage: number;
    onCheckpoint?: (info: { page: number; totalIssues: number; totalPages: number }) => Promise<void> | void;
  }
): Promise<{ issues: TrackerIssue[]; truncated: boolean } | null> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl) {
    return null;
  }
  try {
    return await collectPagedJiraRestIssues(
      async (startAt, maxResults) => {
        const { data } = await api.get<unknown>(jiraAgileBoardIssuesUrl(baseUrl, boardId), {
          params: { fields: '*all', maxResults, startAt },
        });
        return data;
      },
      {
        maxResults: options.perPage,
        maxTotal: options.maxTotal,
        onCheckpoint: options.onCheckpoint,
      }
    );
  } catch {
    return null;
  }
}

export function listJiraIssuesUpdatedInRange(
  api: AxiosInstance,
  since: Date,
  until: Date,
  options?: { maxIssues?: number; perPage?: number; queueKeys?: string[] }
): Promise<{ issues: TrackerIssue[]; truncated: boolean }> {
  if (options?.queueKeys != null && options.queueKeys.length === 0) {
    return Promise.resolve({ issues: [], truncated: false });
  }
  const maxTotal = options?.maxIssues ?? 10_000;
  if (maxTotal <= 0) {
    return Promise.resolve({ issues: [], truncated: true });
  }
  return collectJiraJqlIssues(
    api,
    buildJiraUpdatedRangeJql(since, until, { queueKeys: options?.queueKeys }),
    { maxResults: clampJiraListPerPage(options?.perPage), maxTotal }
  );
}

export async function listJiraIssuesForBoard(
  api: AxiosInstance,
  boardId: number,
  options?: {
    maxTotalIssues?: number;
    onCheckpoint?: (info: {
      boardId: number;
      page: number;
      totalIssues: number;
      totalPages: number;
    }) => Promise<void> | void;
    perPage?: number;
  }
): Promise<{ issues: TrackerIssue[]; truncated: boolean }> {
  const maxTotal = options?.maxTotalIssues ?? Number.POSITIVE_INFINITY;
  if (maxTotal <= 0) {
    return { issues: [], truncated: true };
  }
  const perPage = clampJiraListPerPage(options?.perPage);
  const onCheckpoint = options?.onCheckpoint
    ? (info: { page: number; totalIssues: number; totalPages: number }) =>
        options.onCheckpoint?.({ boardId, ...info })
    : undefined;
  const agile = await fetchAgileBoardIssuePages(api, boardId, { maxTotal, onCheckpoint, perPage });
  if (agile !== null) {
    return agile;
  }
  const projectKey = await fetchJiraBoardProjectKey(api, boardId);
  const jql = buildJiraBoardScopeJql(boardId, projectKey);
  return collectJiraJqlIssues(api, jql, { maxResults: perPage, maxTotal, onCheckpoint });
}

export function listJiraIssuesForQueue(
  api: AxiosInstance,
  queueKey: string,
  options?: {
    maxTotalIssues?: number;
    onCheckpoint?: (info: {
      page: number;
      queueKey: string;
      totalIssues: number;
      totalPages: number;
    }) => Promise<void> | void;
    perPage?: number;
  }
): Promise<{ issues: TrackerIssue[]; truncated: boolean }> {
  const key = queueKey.trim();
  if (!key) {
    return Promise.resolve({ issues: [], truncated: false });
  }
  const maxTotal = options?.maxTotalIssues ?? Number.POSITIVE_INFINITY;
  if (maxTotal <= 0) {
    return Promise.resolve({ issues: [], truncated: true });
  }
  const perPage = clampJiraListPerPage(options?.perPage);
  const onCheckpoint = options?.onCheckpoint
    ? (info: { page: number; totalIssues: number; totalPages: number }) =>
        options.onCheckpoint?.({ queueKey: key, ...info })
    : undefined;
  return collectJiraJqlIssues(api, buildJiraQueueScopeJql(key), {
    maxResults: perPage,
    maxTotal,
    onCheckpoint,
  });
}
