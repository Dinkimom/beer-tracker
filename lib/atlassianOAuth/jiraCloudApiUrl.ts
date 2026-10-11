import { JIRA_CLOUD_OAUTH_API_HOST } from './constants';

/** Jira Cloud REST base for OAuth 3LO (not the site atlassian.net URL). */
export function jiraCloudOAuthApiBaseUrl(cloudId: string): string {
  const id = cloudId.trim();
  if (!id) {
    throw new Error('cloudId is required for Jira Cloud OAuth API');
  }
  return `${JIRA_CLOUD_OAUTH_API_HOST}/ex/jira/${encodeURIComponent(id)}/rest/api/3`;
}

/** REST site URL (`https://acme.atlassian.net/rest/api/3`) from the Atlassian site address; '' if invalid. */
export function jiraCloudSiteRestApiUrl(siteUrl: string): string {
  try {
    return `${new URL(siteUrl.trim()).origin}/rest/api/3`;
  } catch {
    return '';
  }
}

/** Хост сайта Jira Cloud для подписи (`acme.atlassian.net`); исходная строка, если это не URL. */
export function jiraCloudSiteHost(siteOrApiUrl: string): string {
  try {
    return new URL(siteOrApiUrl.trim()).host;
  } catch {
    return siteOrApiUrl.trim();
  }
}

export function cleanTrackerCloudId(raw: string | null | undefined): string {
  return raw?.trim() ?? '';
}
