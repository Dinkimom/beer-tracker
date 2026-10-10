import type { IssueTrackerProviderKind } from './types';

import { TRACKER_CLOUD_ID_HEADER } from '@/lib/atlassianOAuth/constants';
import { cleanTrackerCloudId } from '@/lib/atlassianOAuth/jiraCloudApiUrl';

/** Header for Jira Cloud Basic (org API token). User OAuth uses {@link TRACKER_CLOUD_ID_HEADER}. */
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
    // Site URL (*.atlassian.net) or OAuth gateway (api.atlassian.com/ex/jira/{cloudId}/…).
    return (
      host === 'atlassian.net' ||
      host.endsWith('.atlassian.net') ||
      host === 'api.atlassian.com'
    );
  } catch {
    return false;
  }
}

/** Org-stored Jira Cloud API token uses Basic (email + token) against the site URL. */
export function jiraCloudRequiresBasicAuthEmail(kind: IssueTrackerProviderKind): boolean {
  return kind === 'jira-cloud';
}

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

export function jiraCloudIdFromRequest(request: Request): string {
  return cleanTrackerCloudId(request.headers.get(TRACKER_CLOUD_ID_HEADER));
}

export const JIRA_CLOUD_BASIC_AUTH_EMAIL_REQUIRED_MESSAGE =
  'Укажите email Atlassian-аккаунта для API-токена организации.';

export const JIRA_CLOUD_OAUTH_CLOUD_ID_REQUIRED_MESSAGE =
  'Укажите Atlassian cloudId (повторно выполните Connect with Atlassian).';
