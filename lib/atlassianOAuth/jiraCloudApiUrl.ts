import { JIRA_CLOUD_OAUTH_API_HOST } from './constants';

/** Jira Cloud REST base for OAuth 3LO (not the site atlassian.net URL). */
export function jiraCloudOAuthApiBaseUrl(cloudId: string): string {
  const id = cloudId.trim();
  if (!id) {
    throw new Error('cloudId is required for Jira Cloud OAuth API');
  }
  return `${JIRA_CLOUD_OAUTH_API_HOST}/ex/jira/${encodeURIComponent(id)}/rest/api/3`;
}

export function cleanTrackerCloudId(raw: string | null | undefined): string {
  return raw?.trim() ?? '';
}
