/** Helpers for backlog payload sprint/queue matching (parity with SQL filters). */

import { issueFieldsFromStoredSnapshot } from '@/lib/issueTrackerProvider/snapshotEnvelope';

function sprintObjectIsActive(o: Record<string, unknown>): boolean {
  if (Object.keys(o).length === 0) {
    return false;
  }
  return 'id' in o || 'display' in o;
}

function normalizeSprintField(s: unknown): boolean {
  if (s == null) {
    return false;
  }
  if (Array.isArray(s)) {
    return s.length > 0;
  }
  if (typeof s === 'string') {
    return s.trim().length > 0;
  }
  if (typeof s === 'object' && !Array.isArray(s)) {
    return sprintObjectIsActive(s as Record<string, unknown>);
  }
  return false;
}

export function issuePayloadHasActiveSprintField(payload: unknown): boolean {
  const p = issueFieldsFromStoredSnapshot(payload);
  if (!p) {
    return false;
  }
  if (!('sprint' in p)) {
    return false;
  }
  return normalizeSprintField(p['sprint']);
}

function queueObjectMatchesKey(o: Record<string, unknown>, trackerQueueKey: string): boolean {
  const key = o['key'];
  const id = o['id'];
  if (typeof key === 'string' && key === trackerQueueKey) {
    return true;
  }
  return typeof id === 'string' && id === trackerQueueKey;
}

export function issuePayloadMatchesQueueFilter(
  payload: unknown,
  trackerQueueKey: string | null | undefined
): boolean {
  if (trackerQueueKey == null || trackerQueueKey === '') {
    return true;
  }
  const p = issueFieldsFromStoredSnapshot(payload);
  if (!p) {
    return false;
  }
  const q = p['queue'];
  if (typeof q === 'string') {
    return q === trackerQueueKey;
  }
  if (q && typeof q === 'object' && !Array.isArray(q)) {
    return queueObjectMatchesKey(q as Record<string, unknown>, trackerQueueKey);
  }
  return false;
}
