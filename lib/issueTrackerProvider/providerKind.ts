import { isJiraCloudHost } from './jiraBasicAuthEmail';
import { ISSUE_TRACKER_PROVIDER_KINDS, type IssueTrackerProviderKind } from './types';

/**
 * Канонические значения `ISSUE_TRACKER_PROVIDER` и алиасы:
 * `yandex-tracker` → `tracker`; `jira` → Cloud vs DC по TRACKER_API_URL.
 */
export function parseIssueTrackerProviderKind(
  raw: string | null | undefined,
  trackerApiUrl = ''
): IssueTrackerProviderKind | null {
  const key = raw?.trim().toLowerCase() ?? '';
  if (!key) {
    return null;
  }
  if (key === 'tracker' || key === 'yandex-tracker') {
    return 'tracker';
  }
  if (key === 'jira-onprem' || key === 'jira-cloud') {
    return key;
  }
  if (key === 'jira') {
    return isJiraCloudHost(trackerApiUrl) ? 'jira-cloud' : 'jira-onprem';
  }
  return null;
}

export function issueTrackerProviderKindEnvErrorMessage(): string {
  return `ISSUE_TRACKER_PROVIDER must be one of: ${ISSUE_TRACKER_PROVIDER_KINDS.join(', ')}`;
}
