import type { IssueTrackerProviderKind, IssueTrackerUser } from './types';
import type { AxiosInstance } from 'axios';

interface JiraUserRaw {
  accountId?: string;
  active?: boolean;
  avatarUrls?: { '48x48'?: string };
  displayName?: string;
  email?: string | null;
  emailAddress?: string | null;
  key?: string;
  name?: string;
}

export function mapJiraUserSearchHit(raw: unknown): IssueTrackerUser | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as JiraUserRaw;
  if (row.active === false) {
    return null;
  }
  const trackerId = row.accountId?.trim() || row.name?.trim() || row.key?.trim();
  if (!trackerId) {
    return null;
  }
  const displayName = row.displayName?.trim() || trackerId;
  const email = row.emailAddress?.trim() || row.email?.trim() || null;
  const avatarUrl = row.avatarUrls?.['48x48']?.trim() || null;
  return {
    avatarUrl,
    displayName,
    email,
    trackerId,
  };
}

/**
 * Cloud rejects `username` (HTTP 400). Data Center / Server still search by `username`.
 */
export function jiraUserSearchRequestParams(
  query: string,
  kind: IssueTrackerProviderKind,
  maxResults = 50
): { maxResults: number; query?: string; username?: string } {
  const q = query.trim();
  if (kind === 'jira-cloud') {
    return { maxResults, query: q };
  }
  return { maxResults, username: q };
}

function jiraUsersFromResponse(data: unknown): IssueTrackerUser[] {
  const items = Array.isArray(data) ? data : [];
  return items
    .map(mapJiraUserSearchHit)
    .filter((user): user is IssueTrackerUser => user != null);
}

/**
 * Один запрос: Cloud `GET /user/search?query=`, DC `?username=`.
 * `emailAddress` приходит в том же объекте, если это позволяет visibility в Jira.
 */
export async function searchJiraUsers(
  api: AxiosInstance,
  query: string,
  kind: IssueTrackerProviderKind
): Promise<IssueTrackerUser[]> {
  const q = query.trim();
  if (q.length < 2) {
    return [];
  }
  const { data } = await api.get<unknown>('/user/search', {
    params: jiraUserSearchRequestParams(q, kind),
  });
  return jiraUsersFromResponse(data);
}
