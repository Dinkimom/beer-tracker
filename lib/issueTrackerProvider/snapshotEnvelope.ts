import type { IssueTrackerStoredProvider } from './types';

const ISSUE_SNAPSHOT_PAYLOAD_SCHEMA_VERSION = 1 as const;
const DEFAULT_STORED_PROVIDER: IssueTrackerStoredProvider = 'yandex-tracker';

interface IssueSnapshotStoredEnvelope {
  payload: unknown;
  provider: IssueTrackerStoredProvider;
  schemaVersion: typeof ISSUE_SNAPSHOT_PAYLOAD_SCHEMA_VERSION;
}

interface UnwrappedIssueSnapshotPayload {
  payload: unknown;
  provider: IssueTrackerStoredProvider;
}

export function isIssueSnapshotStoredEnvelope(
  value: unknown
): value is IssueSnapshotStoredEnvelope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.provider === 'string' &&
    rec.payload !== undefined &&
    rec.schemaVersion === ISSUE_SNAPSHOT_PAYLOAD_SCHEMA_VERSION
  );
}

export function wrapIssueSnapshotForStorage(
  provider: IssueTrackerStoredProvider,
  payload: unknown
): IssueSnapshotStoredEnvelope {
  return {
    payload,
    provider,
    schemaVersion: ISSUE_SNAPSHOT_PAYLOAD_SCHEMA_VERSION,
  };
}

/**
 * Разворачивает payload из issue_snapshots.
 * Legacy-строки без envelope считаются Yandex Tracker flat payload.
 */
export function unwrapIssueSnapshotPayload(
  stored: unknown,
  defaultProvider: IssueTrackerStoredProvider = DEFAULT_STORED_PROVIDER
): UnwrappedIssueSnapshotPayload {
  if (isIssueSnapshotStoredEnvelope(stored)) {
    return {
      payload: stored.payload,
      provider: stored.provider,
    };
  }
  return {
    payload: stored,
    provider: defaultProvider,
  };
}

/**
 * Поля задачи из payload снимка: envelope → inner, legacy flat → как есть.
 */
export function issueFieldsFromStoredSnapshot(
  stored: unknown
): Record<string, unknown> | null {
  const { payload } = unwrapIssueSnapshotPayload(stored);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  return payload as Record<string, unknown>;
}
