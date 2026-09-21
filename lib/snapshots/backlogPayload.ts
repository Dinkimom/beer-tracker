/**
 * Чистая логика «бэклог по спринту» в payload (паритет с пустым массивом sprints в CH).
 * SQL в `issueSnapshotRead` дублирует эти правила — при изменении синхронизировать оба места.
 */

import { issueFieldsFromStoredSnapshot } from '@/lib/issueTrackerProvider/snapshotEnvelope';

import {
  issuePayloadHasActiveSprintField,
  issuePayloadMatchesQueueFilter,
} from './backlogPayloadHelpers';

export { issuePayloadHasActiveSprintField, issuePayloadMatchesQueueFilter };

const DEFAULT_ISSUE_TYPE_KEYS = ['task', 'bug'] as const;
const DEFAULT_EXCLUDE_STATUS_KEYS = ['closed'] as const;

export function issuePayloadIsBacklogBySprint(payload: unknown): boolean {
  return !issuePayloadHasActiveSprintField(payload);
}

export function issuePayloadMatchesTypeKeys(
  payload: unknown,
  issueTypeKeys: readonly string[] = DEFAULT_ISSUE_TYPE_KEYS
): boolean {
  const p = issueFieldsFromStoredSnapshot(payload);
  if (!p) return false;
  const t = p['type'];
  if (!t || typeof t !== 'object' || Array.isArray(t)) return false;
  const key = (t as Record<string, unknown>)['key'];
  if (typeof key !== 'string') return false;
  return issueTypeKeys.includes(key);
}

export function issuePayloadMatchesStatusExclusion(
  payload: unknown,
  excludeStatusKeys: readonly string[] = DEFAULT_EXCLUDE_STATUS_KEYS
): boolean {
  const p = issueFieldsFromStoredSnapshot(payload);
  if (!p) return true;
  if (!('status' in p)) return true;
  const st = p['status'];
  if (!st || typeof st !== 'object' || Array.isArray(st)) return true;
  const key = (st as Record<string, unknown>)['key'];
  if (typeof key !== 'string') return true;
  return !excludeStatusKeys.includes(key);
}

/** Все условия бэклога как в `queryBacklogIssueSnapshots` (для тестов и офлайн-фильтрации). */
export function issuePayloadMatchesBacklogFilters(
  payload: unknown,
  options: {
    trackerQueueKey?: string | null;
    issueTypeKeys?: readonly string[];
    excludeStatusKeys?: readonly string[];
    onlyWithoutSprint?: boolean;
  } = {}
): boolean {
  const {
    trackerQueueKey,
    issueTypeKeys = DEFAULT_ISSUE_TYPE_KEYS,
    excludeStatusKeys = DEFAULT_EXCLUDE_STATUS_KEYS,
    onlyWithoutSprint = true,
  } = options;

  if (!issuePayloadMatchesQueueFilter(payload, trackerQueueKey)) return false;
  if (!issuePayloadMatchesTypeKeys(payload, issueTypeKeys)) return false;
  if (!issuePayloadMatchesStatusExclusion(payload, excludeStatusKeys)) return false;
  if (onlyWithoutSprint && !issuePayloadIsBacklogBySprint(payload)) return false;
  return true;
}
