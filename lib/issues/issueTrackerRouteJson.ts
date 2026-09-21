import type { IssueTrackerIssue } from '@/lib/issueTrackerProvider';
import type { TrackerIntegrationStored } from '@/lib/trackerIntegration';
import type { Task } from '@/types';

import { mapIssueSnapshotPayloadToTask } from '@/lib/issueTrackerProvider';

interface IssueSearchApiItem {
  key: string;
  summary: string;
  task: Task;
}

export function taskJsonFromSnapshotRow(
  row: { payload: unknown } | null,
  integration?: TrackerIntegrationStored | null
): Task | null {
  if (!row) {
    return null;
  }
  return mapIssueSnapshotPayloadToTask(row.payload, integration);
}

export function buildIssueSearchApiResponse(
  issues: IssueTrackerIssue[],
  mapIssueToTask: (
    issue: IssueTrackerIssue,
    integration?: TrackerIntegrationStored | null
  ) => Task,
  integration?: TrackerIntegrationStored | null
): { items: IssueSearchApiItem[] } {
  return {
    items: issues.map((issue) => ({
      key: issue.key,
      summary: issue.summary ?? '',
      task: mapIssueToTask(issue, integration),
    })),
  };
}

export function buildTransitionsBatchApiResponse(
  issueKeys: unknown,
  data: Record<string, unknown>
): Record<string, unknown> {
  const keys = Array.isArray(issueKeys)
    ? issueKeys.filter((key): key is string => typeof key === 'string')
    : [];
  if (keys.length === 0) {
    return {};
  }
  return data;
}
