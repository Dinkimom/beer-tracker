import type { IssueTrackerProvider, IssueTrackerProviderKind } from './types';

import { jiraTrackerProvider } from './jiraProvider';
import {
  DEFAULT_ISSUE_TRACKER_PROVIDER_KIND,
  ISSUE_TRACKER_PROVIDER_KINDS,
} from './types';
import { yandexTrackerProvider } from './yandexTrackerProvider';

const issueTrackerProviders = {
  tracker: yandexTrackerProvider,
  'jira-cloud': jiraTrackerProvider,
  'jira-onprem': jiraTrackerProvider,
} satisfies Record<IssueTrackerProviderKind, IssueTrackerProvider>;

export function isIssueTrackerProviderKind(
  value: unknown
): value is IssueTrackerProviderKind {
  return (
    typeof value === 'string' &&
    ISSUE_TRACKER_PROVIDER_KINDS.includes(value as IssueTrackerProviderKind)
  );
}

export function resolveIssueTrackerProvider(
  kind: IssueTrackerProviderKind = DEFAULT_ISSUE_TRACKER_PROVIDER_KIND
): IssueTrackerProvider {
  if (!ISSUE_TRACKER_PROVIDER_KINDS.includes(kind)) {
    throw new Error(`Unsupported issue tracker provider: ${String(kind)}`);
  }
  const provider = issueTrackerProviders[kind];
  if (!provider) {
    throw new Error(`Unsupported issue tracker provider: ${String(kind)}`);
  }
  return provider;
}
