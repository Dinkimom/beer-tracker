import type { TrackerIssue } from '@/types/tracker';

import { issueFieldsFromStoredSnapshot } from '@/lib/issueTrackerProvider/snapshotEnvelope';

export const ISSUE_SNAPSHOT_KEYS_BATCH_SIZE = 150;

export function uniqueTrimmedIssueKeys(issueKeys: string[]): string[] {
  return [...new Set(issueKeys.map((k) => k.trim()).filter(Boolean))];
}

export function trackerIssueFromSnapshotRow(issueKey: string, payload: unknown): TrackerIssue {
  const fields = issueFieldsFromStoredSnapshot(payload);
  const rec = fields ? { ...fields } : {};
  if (typeof rec.key !== 'string' || rec.key.trim() === '') {
    rec.key = issueKey;
  }
  if (typeof rec.id !== 'string' || rec.id.trim() === '') {
    rec.id = issueKey;
  }
  if (typeof rec.summary !== 'string') {
    rec.summary = issueKey;
  }
  if (typeof rec.self !== 'string') {
    rec.self = '';
  }
  return rec as unknown as TrackerIssue;
}

export function trackerIssuesFromSnapshotRows(
  rows: Array<{ issue_key: string; payload: unknown }>
): TrackerIssue[] {
  return rows.map((row) => trackerIssueFromSnapshotRow(row.issue_key, row.payload));
}

export function mergeTrackerIssuesByKey(
  byKey: Map<string, TrackerIssue>,
  rows: Array<{ issue_key: string; payload: unknown }>
): void {
  for (const row of rows) {
    const issue = trackerIssueFromSnapshotRow(row.issue_key, row.payload);
    byKey.set(issue.key, issue);
  }
}
