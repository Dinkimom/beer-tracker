import type { IssueTrackerIssue } from './types';
import type { TrackerIntegrationStored } from '@/lib/trackerIntegration';
import type { Task } from '@/types';
import type { TrackerIssue } from '@/types/tracker';

import { mapTrackerIssueToTask } from '@/lib/trackerApi';

import { mapIssueTrackerIssueToTask } from './mapIssueTrackerIssueToTask';
import { unwrapIssueSnapshotPayload } from './snapshotEnvelope';
import { normalizeYandexIssue } from './yandexTrackerProvider';

function isProviderIssue(payload: unknown): payload is IssueTrackerIssue {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }
  const rec = payload as Record<string, unknown>;
  return rec.provider === 'yandex-tracker' || rec.provider === 'jira';
}

function mapProviderIssueToTask(
  issue: IssueTrackerIssue,
  integration?: TrackerIntegrationStored | null
): Task {
  switch (issue.provider) {
    case 'yandex-tracker':
    case 'jira':
      return mapIssueTrackerIssueToTask(issue, integration);
    default: {
      const exhaustive: never = issue.provider;
      throw new Error(`Unsupported issue tracker provider: ${exhaustive}`);
    }
  }
}

/**
 * Карточка Task из payload снимка: legacy Yandex, provider issue или envelope.
 */
export function mapIssueSnapshotPayloadToTask(
  payload: unknown,
  integration?: TrackerIntegrationStored | null
): Task {
  const unwrapped = unwrapIssueSnapshotPayload(payload);
  if (isProviderIssue(unwrapped.payload)) {
    return mapProviderIssueToTask(unwrapped.payload, integration);
  }
  if (unwrapped.provider === 'jira') {
    return mapTrackerIssueToTask(unwrapped.payload as TrackerIssue, integration);
  }
  return mapProviderIssueToTask(
    normalizeYandexIssue(unwrapped.payload as TrackerIssue),
    integration
  );
}
