import type { IssueTrackerProviderKind } from './types';

import { isJiraCloudHost } from './jiraBasicAuthEmail';

/**
 * Тип трекера из `settings.issueTracker.provider` или query-параметра.
 * Алиасы: `yandex-tracker` → `tracker`; `jira` → Cloud vs DC по URL API.
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
