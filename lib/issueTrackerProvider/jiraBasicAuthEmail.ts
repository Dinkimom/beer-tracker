import type { IssueTrackerProviderKind } from './types';

/** Email Atlassian-аккаунта для Jira Cloud Basic (`email:apiToken`). Пара к `X-Tracker-Token`. */
export const TRACKER_EMAIL_HEADER = 'x-tracker-email' as const;

export function cleanJiraBasicAuthEmail(raw: string | null | undefined): string {
  return raw?.trim() ?? '';
}

export function isJiraCloudHost(urlOrHost: string): boolean {
  const raw = urlOrHost.trim();
  if (!raw) {
    return false;
  }
  try {
    const host = (raw.includes('://') ? new URL(raw).hostname : raw).toLowerCase();
    return host === 'atlassian.net' || host.endsWith('.atlassian.net');
  } catch {
    return false;
  }
}

export function jiraCloudRequiresBasicAuthEmail(kind: IssueTrackerProviderKind): boolean {
  return kind === 'jira-cloud';
}

/**
 * Email для Basic-auth: у пользовательского токена — только из запроса;
 * у org-токена (sync/админка) — сохранённый email того, кто подключил трекер.
 */
export function resolveJiraBasicAuthEmail(input: {
  requestEmail?: string;
  storedOrgEmail?: string;
  usingRequestToken: boolean;
}): string {
  const requestEmail = cleanJiraBasicAuthEmail(input.requestEmail);
  if (input.usingRequestToken) {
    return requestEmail;
  }
  return cleanJiraBasicAuthEmail(input.storedOrgEmail);
}

export function jiraEmailFromRequest(request: Request): string {
  return cleanJiraBasicAuthEmail(request.headers.get(TRACKER_EMAIL_HEADER));
}

export const JIRA_CLOUD_BASIC_AUTH_EMAIL_REQUIRED_MESSAGE =
  'Укажите email Atlassian-аккаунта, с которого создан этот API-токен.';
