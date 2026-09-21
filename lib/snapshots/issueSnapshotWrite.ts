/**
 * Запись снимков задач в issue_snapshots (tenant-scoped).
 */

import type { IssueTrackerStoredProvider } from '@/lib/issueTrackerProvider/types';
import type { TrackerIssue } from '@/types/tracker';

import { query } from '@/lib/db';
import { wrapIssueSnapshotForStorage } from '@/lib/issueTrackerProvider/snapshotEnvelope';

import { stringifyForPostgresJsonb } from './sanitizePayloadForPostgresJsonb';

export function storedIssueSnapshotForUpsert(
  issue: TrackerIssue,
  provider: IssueTrackerStoredProvider = 'yandex-tracker'
) {
  return {
    issueKey: issue.key,
    storedPayload: wrapIssueSnapshotForStorage(provider, issue),
    trackerUpdatedAt: issue.updatedAt ?? null,
  };
}

export async function upsertIssueSnapshotsForOrg(
  organizationId: string,
  issues: TrackerIssue[],
  options?: { provider?: IssueTrackerStoredProvider }
): Promise<number> {
  const provider = options?.provider ?? 'yandex-tracker';
  let n = 0;
  for (const issue of issues) {
    const { issueKey, storedPayload, trackerUpdatedAt } = storedIssueSnapshotForUpsert(
      issue,
      provider
    );
    await query(
      `INSERT INTO issue_snapshots (organization_id, issue_key, payload, tracker_updated_at)
       VALUES ($1, $2, $3::jsonb, $4)
       ON CONFLICT (organization_id, issue_key) DO UPDATE
       SET payload = EXCLUDED.payload,
           tracker_updated_at = EXCLUDED.tracker_updated_at,
           synced_at = CURRENT_TIMESTAMP`,
      [organizationId, issueKey, stringifyForPostgresJsonb(storedPayload), trackerUpdatedAt]
    );
    n += 1;
  }
  return n;
}
