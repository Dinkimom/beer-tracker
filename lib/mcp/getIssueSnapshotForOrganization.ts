import { findIssueSnapshot } from '@/lib/snapshots';

const MAX_DESCRIPTION = 8000;

function trimDescription(text: string | undefined): string | null {
  const value = text?.trim() ?? '';
  if (!value) {
    return null;
  }
  return value.length > MAX_DESCRIPTION ? `${value.slice(0, MAX_DESCRIPTION - 1)}…` : value;
}

/**
 * Synced Jira/Tracker dump row from `issue_snapshots` (admin sync), not a live API call.
 */
export async function getIssueSnapshotForOrganization(input: {
  issueKey: string;
  organizationId: string;
}): Promise<{
  snapshot: {
    assignee: string | null;
    createdAt: string | null;
    description: string | null;
    issueType: string | null;
    key: string;
    parentKey: string | null;
    priority: string | null;
    status: string | null;
    statusDisplay: string | null;
    statusType: string | null;
    summary: string | null;
    syncedAt: string;
    trackerUpdatedAt: string | null;
    updatedAt: string | null;
  } | null;
  warnings: string[];
}> {
  const key = input.issueKey.trim();
  const row = await findIssueSnapshot(input.organizationId, key);
  if (!row) {
    return {
      snapshot: null,
      warnings: [`snapshot_not_found: ${key} (run admin sync / full rescan if missing)`],
    };
  }
  const payload = row.payload;
  return {
    snapshot: {
      assignee: payload.assignee?.display?.trim() || payload.assignee?.id || null,
      createdAt: payload.createdAt?.trim() || null,
      description: trimDescription(payload.description),
      issueType: payload.type?.display?.trim() || payload.type?.key?.trim() || null,
      key: payload.key?.trim() || key,
      parentKey: payload.parent?.key?.trim() || null,
      priority: payload.priority?.display?.trim() || payload.priority?.key?.trim() || null,
      status: payload.status?.key?.trim() || null,
      statusDisplay: payload.status?.display?.trim() || null,
      statusType: payload.statusType?.key?.trim() || null,
      summary: payload.summary?.trim() || null,
      syncedAt: row.synced_at,
      trackerUpdatedAt: row.tracker_updated_at,
      updatedAt: payload.updatedAt?.trim() || null,
    },
    warnings: [],
  };
}
