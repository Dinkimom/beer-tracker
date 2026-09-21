/**
 * Чтение задач из beer_tracker.issue_snapshots.
 */

import type {
  IssueSnapshotRow,
  QueryBacklogSnapshotsParams,
  QueryBacklogSnapshotsResult,
} from './types';

import { issueFieldsFromStoredSnapshot } from '@/lib/issueTrackerProvider/snapshotEnvelope';
import { issuePayloadMatchesBacklogFilters } from '@/lib/snapshots/backlogPayload';

import {
  findIssueSnapshotByKey,
  findIssueSnapshotMetaByKeys,
  queryIssueSnapshotsByQueue,
} from './issueSnapshotReadDb';
import { statusKeyTypeKeySummaryFromPayload } from './snapshotPayloadSummary';

const DEFAULT_ISSUE_TYPES = ['task', 'bug'];
const DEFAULT_EXCLUDE_STATUS = ['closed'];

function toSnapshotRow(organizationId: string, stored: unknown): IssueSnapshotRow {
  const fields = issueFieldsFromStoredSnapshot(stored);
  const payload = (fields ?? stored) as IssueSnapshotRow['payload'];
  return {
    organization_id: organizationId,
    issue_key: payload.key,
    payload,
    synced_at: new Date().toISOString(),
    tracker_updated_at: payload.updatedAt ?? null,
  };
}

export async function findIssueSnapshot(
  organizationId: string,
  issueKey: string
): Promise<IssueSnapshotRow | null> {
  const payload = await findIssueSnapshotByKey(organizationId, issueKey);
  if (!payload) {
    return null;
  }
  return toSnapshotRow(organizationId, payload);
}

/** Статусы, типы и summary задач из issue_snapshots. */
export async function fetchIssueStatusesTypesAndSummariesFromSnapshots(
  organizationId: string,
  issueKeys: string[]
): Promise<{
  statuses: Map<string, string>;
  summaries: Map<string, string>;
  types: Map<string, string>;
}> {
  const unique = [...new Set(issueKeys.map((k) => k.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return { statuses: new Map(), types: new Map(), summaries: new Map() };
  }
  const payloads = await findIssueSnapshotMetaByKeys(organizationId, unique);
  const statuses = new Map<string, string>();
  const types = new Map<string, string>();
  const summaries = new Map<string, string>();
  for (const stored of payloads) {
    const fields = issueFieldsFromStoredSnapshot(stored);
    if (!fields || typeof fields.key !== 'string' || fields.key.length === 0) {
      continue;
    }
    const { status, type, summary } = statusKeyTypeKeySummaryFromPayload(fields);
    statuses.set(fields.key, status);
    types.set(fields.key, type);
    summaries.set(fields.key, summary);
  }
  return { statuses, summaries, types };
}

/**
 * Бэклог: пустой/отсутствующий sprint, тип task|bug, статус не в exclude, опционально queue.
 */
export async function queryBacklogIssueSnapshots(
  organizationId: string,
  params: QueryBacklogSnapshotsParams = {}
): Promise<QueryBacklogSnapshotsResult> {
  const issueTypeKeys = params.issueTypeKeys?.length
    ? params.issueTypeKeys
    : DEFAULT_ISSUE_TYPES;
  const excludeStatusKeys = params.excludeStatusKeys?.length
    ? params.excludeStatusKeys
    : DEFAULT_EXCLUDE_STATUS;
  const onlyWithoutSprint = params.onlyWithoutSprint !== false;
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(200, Math.max(1, params.perPage ?? 50));
  const offset = (page - 1) * perPage;

  const queueKey = params.trackerQueueKey?.trim() || '';
  const queueIssues = queueKey
    ? await queryIssueSnapshotsByQueue(organizationId, queueKey)
    : [];
  const filtered = queueIssues
    .filter((issue) =>
      issuePayloadMatchesBacklogFilters(issue, {
        excludeStatusKeys,
        issueTypeKeys,
        onlyWithoutSprint,
        trackerQueueKey: queueKey || null,
      })
    )
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

  const paged = filtered.slice(offset, offset + perPage);
  const totalCount = filtered.length;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / perPage);

  return {
    rows: paged.map((payload) => toSnapshotRow(organizationId, payload)),
    totalCount,
    totalPages,
  };
}
