import type { AxiosInstance } from 'axios';

import { isJiraCloudHost } from './jiraBasicAuthEmail';

/** Jira Cloud снял POST /rest/api/3/search; пагинация идёт через nextPageToken. */
function usesJiraCloudIssueSearch(api: AxiosInstance): boolean {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  return isJiraCloudHost(baseUrl);
}

export function readJiraSearchNextPageToken(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }
  const token = (data as { nextPageToken?: unknown }).nextPageToken;
  if (typeof token !== 'string') {
    return undefined;
  }
  const trimmed = token.trim();
  return trimmed || undefined;
}

/** Оценка числа задач до постраничной выгрузки. У Cloud в ответе поиска больше нет total. */
export async function countJiraCloudIssues(
  api: AxiosInstance,
  jql: string
): Promise<number | null> {
  if (!usesJiraCloudIssueSearch(api)) {
    return null;
  }
  try {
    const { data } = await api.post<unknown>('/search/approximate-count', { jql });
    const count =
      data && typeof data === 'object' ? (data as { count?: unknown }).count : undefined;
    if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) {
      return null;
    }
    return count;
  } catch {
    return null;
  }
}

export async function postJiraIssueSearch(
  api: AxiosInstance,
  body: {
    fields: readonly string[];
    jql: string;
    maxResults: number;
    nextPageToken?: string;
    startAt: number;
  }
): Promise<unknown> {
  if (usesJiraCloudIssueSearch(api)) {
    const { data } = await api.post<unknown>('/search/jql', {
      fields: [...body.fields],
      jql: body.jql,
      maxResults: body.maxResults,
      ...(body.nextPageToken ? { nextPageToken: body.nextPageToken } : {}),
    });
    return data;
  }
  const { data } = await api.post<unknown>('/search', {
    fields: [...body.fields],
    jql: body.jql,
    maxResults: body.maxResults,
    startAt: body.startAt,
  });
  return data;
}
