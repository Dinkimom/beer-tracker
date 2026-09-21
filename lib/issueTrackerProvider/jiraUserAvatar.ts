/**
 * Аватар пользователя Jira: GET /user → avatarUrls['48x48'].
 * Только Jira Cloud / Data Center — Яндекс Трекер аватары не отдаёт.
 */

import type { IssueTrackerProviderKind } from './types';
import type { AxiosInstance } from 'axios';

export function jiraUserGetRequestParams(
  trackerId: string,
  kind: IssueTrackerProviderKind
): { accountId: string } | { key: string } | { username: string } {
  const id = trackerId.trim();
  if (kind === 'jira-cloud') {
    return { accountId: id };
  }
  return { username: id };
}

function readJiraAvatarUrlFromUserPayload(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const urls = (raw as { avatarUrls?: { '48x48'?: string } }).avatarUrls;
  return urls?.['48x48']?.trim() || null;
}

async function readJiraUserAvatarOnce(
  api: AxiosInstance,
  params: Record<string, string>
): Promise<string | null> {
  try {
    const { data } = await api.get<unknown>('/user', { params });
    return readJiraAvatarUrlFromUserPayload(data);
  } catch {
    return null;
  }
}

/**
 * Cloud: `accountId`. DC/Server: `username`, затем `key`.
 */
export async function fetchJiraUserAvatarUrl(
  api: AxiosInstance,
  trackerId: string,
  kind: IssueTrackerProviderKind
): Promise<string | null> {
  const id = trackerId.trim();
  if (!id) {
    return null;
  }
  const primary = await readJiraUserAvatarOnce(api, jiraUserGetRequestParams(id, kind));
  if (primary || kind === 'jira-cloud') {
    return primary;
  }
  return readJiraUserAvatarOnce(api, { key: id });
}
