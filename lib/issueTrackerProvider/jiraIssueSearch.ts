import type { IssueTrackerIssueSearchOptions } from './types';
import type { TrackerIssue } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { fetchJiraBoardProjectKey, jiraAgileBoardIssuesUrl } from './jiraCatalog';
import {
  extractJiraIssueRows,
  mapJiraRestIssueToTrackerIssue,
} from './jiraIssues';
import {
  appendJiraJqlAnd,
  buildJiraIssueSearchJql,
  buildJiraIssueSearchTextClause,
} from './jiraIssueSearchJql';
import { postJiraIssueSearch } from './jiraIssueSearchRequest';

const JIRA_BOARD_ISSUE_SEARCH_MAX = 20;
const JIRA_SEARCH_ISSUE_FIELDS = ['*all'] as const;
const JIRA_EPIC_TYPE_FALLBACK_JQL = 'issuetype = Epic';

async function fetchJiraIssueSearchPage(
  requestPage: (startAt: number, maxResults: number) => Promise<unknown>
): Promise<TrackerIssue[]> {
  const data = await requestPage(0, JIRA_BOARD_ISSUE_SEARCH_MAX);
  const rows = extractJiraIssueRows(data);
  const out: TrackerIssue[] = [];
  for (const row of rows) {
    const mapped = mapJiraRestIssueToTrackerIssue(row);
    if (mapped) {
      out.push(mapped);
    }
  }
  return out;
}

async function fetchAgileBoardIssues(
  api: AxiosInstance,
  boardId: number,
  jql: string
): Promise<TrackerIssue[] | null> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl || !jql) {
    return null;
  }
  try {
    return await fetchJiraIssueSearchPage(async (startAt, maxResults) => {
      const { data } = await api.get<unknown>(jiraAgileBoardIssuesUrl(baseUrl, boardId), {
        params: { fields: '*all', jql, maxResults, startAt },
      });
      return data;
    });
  } catch {
    return null;
  }
}

function fetchJqlBoardIssues(api: AxiosInstance, jql: string): Promise<TrackerIssue[]> {
  return fetchJiraIssueSearchPage((startAt, maxResults) =>
    postJiraIssueSearch(api, {
      fields: JIRA_SEARCH_ISSUE_FIELDS,
      jql,
      maxResults,
      startAt,
    })
  );
}

function isHttpBadRequest(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  return (error as { response?: { status?: number } }).response?.status === 400;
}

export function isJiraEpicIssueTypeKey(key: string | undefined): boolean {
  const normalized = key?.trim().toLowerCase() ?? '';
  return normalized === 'epic' || normalized === 'эпик';
}

function jiraEpicIssueTypeId(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as { hierarchyLevel?: unknown; id?: unknown; name?: string; subtask?: boolean };
  if (row.subtask === true) {
    return null;
  }
  const id = row.id != null ? String(row.id).trim() : '';
  if (!id) {
    return null;
  }
  const key = (row.name ?? '').trim().toLowerCase().replaceAll(/\s+/g, '');
  if (row.hierarchyLevel === 1 || isJiraEpicIssueTypeKey(key)) {
    return id;
  }
  return null;
}

export function pickJiraEpicIssueTypeIds(types: unknown[]): string[] {
  const ids: string[] = [];
  for (const raw of types) {
    const id = jiraEpicIssueTypeId(raw);
    if (id) {
      ids.push(id);
    }
  }
  return ids;
}

async function fetchJiraParentCandidateTypeClause(api: AxiosInstance): Promise<string> {
  try {
    const { data } = await api.get<unknown>('/issuetype');
    const ids = pickJiraEpicIssueTypeIds(Array.isArray(data) ? data : []);
    if (ids.length > 0) {
      return `issuetype in (${ids.join(', ')})`;
    }
  } catch {
    // Classic boards still understand the default Epic type name.
  }
  return JIRA_EPIC_TYPE_FALLBACK_JQL;
}

function keepJiraParentCandidates(issues: TrackerIssue[]): TrackerIssue[] {
  return issues.filter((issue) => isJiraEpicIssueTypeKey(issue.type?.key));
}

async function searchJiraBoardIssues(
  api: AxiosInstance,
  boardId: number,
  queryText: string,
  typeClause: string
): Promise<TrackerIssue[]> {
  const textClause = buildJiraIssueSearchTextClause(queryText);
  const agile = await fetchAgileBoardIssues(api, boardId, appendJiraJqlAnd(textClause, typeClause));
  if (agile !== null) {
    return agile;
  }

  const projectKey = await fetchJiraBoardProjectKey(api, boardId);
  const jql = buildJiraIssueSearchJql(boardId, queryText, { extraAnd: typeClause, projectKey });
  try {
    return await fetchJqlBoardIssues(api, jql);
  } catch (error) {
    if (isHttpBadRequest(error)) {
      return [];
    }
    throw error;
  }
}

/** Поиск задач на доске (первая страница, до 20 результатов). */
export async function searchJiraIssuesOnBoard(
  api: AxiosInstance,
  boardId: number,
  queryText: string,
  options?: IssueTrackerIssueSearchOptions
): Promise<TrackerIssue[]> {
  const textClause = buildJiraIssueSearchTextClause(queryText);
  if (!textClause) {
    return [];
  }

  const typeClause = options?.parentCandidates ? await fetchJiraParentCandidateTypeClause(api) : '';
  const issues = await searchJiraBoardIssues(api, boardId, queryText, typeClause);
  return options?.parentCandidates ? keepJiraParentCandidates(issues) : issues;
}
