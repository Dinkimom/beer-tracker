import type { TrackerIssue } from '@/types/tracker';

import { query } from '@/lib/db';

import { issueSnapshotQueueWhereSql } from './issueSnapshotQueueSql';
import {
  ISSUE_SNAPSHOT_KEYS_BATCH_SIZE,
  mergeTrackerIssuesByKey,
  trackerIssueFromSnapshotRow,
  trackerIssuesFromSnapshotRows,
  uniqueTrimmedIssueKeys,
} from './issueSnapshotRowMapping';

interface IssueSnapshotRow {
  issue_key: string;
  payload: unknown;
}

export async function findIssueSnapshotByKey(
  organizationId: string,
  issueKey: string
): Promise<TrackerIssue | null> {
  const key = issueKey.trim();
  if (!key) {
    return null;
  }
  const res = await query<IssueSnapshotRow>(
    `SELECT issue_key, payload
     FROM issue_snapshots
     WHERE organization_id = $1::uuid
       AND issue_key = $2
     LIMIT 1`,
    [organizationId, key]
  );
  const row = res.rows[0];
  return row ? trackerIssueFromSnapshotRow(row.issue_key, row.payload) : null;
}

/** Статус/тип/summary без changelog (для batch parent-statuses). */
export async function findIssueSnapshotMetaByKeys(
  organizationId: string,
  issueKeys: string[]
): Promise<TrackerIssue[]> {
  const unique = uniqueTrimmedIssueKeys(issueKeys);
  if (unique.length === 0) {
    return [];
  }

  const byKey = new Map<string, TrackerIssue>();
  for (let offset = 0; offset < unique.length; offset += ISSUE_SNAPSHOT_KEYS_BATCH_SIZE) {
    const chunk = unique.slice(offset, offset + ISSUE_SNAPSHOT_KEYS_BATCH_SIZE);
    const res = await query<IssueSnapshotRow>(
      `SELECT issue_key, payload
       FROM issue_snapshots
       WHERE organization_id = $1::uuid
         AND issue_key = ANY($2::text[])`,
      [organizationId, chunk]
    );
    mergeTrackerIssuesByKey(byKey, res.rows);
  }

  return [...byKey.values()];
}

export async function queryIssueSnapshotsByQueue(
  organizationId: string,
  queueKey: string
): Promise<TrackerIssue[]> {
  const queue = queueKey.trim();
  if (!queue) {
    return [];
  }
  const res = await query<IssueSnapshotRow>(
    `SELECT issue_key, payload
     FROM issue_snapshots
     WHERE organization_id = $1::uuid
       AND ${issueSnapshotQueueWhereSql(2)}`,
    [organizationId, queue]
  );
  return trackerIssuesFromSnapshotRows(res.rows);
}
