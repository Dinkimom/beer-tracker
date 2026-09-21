/**
 * Поля из payload снимка для batch-эндпоинтов (паритет с CH: status / issue_type / title).
 */

import type { TrackerIssue } from '@/types/tracker';

import { issueFieldsFromStoredSnapshot } from '@/lib/issueTrackerProvider/snapshotEnvelope';

export function statusKeyTypeKeySummaryFromPayload(stored: unknown): {
  status: string;
  summary: string;
  type: string;
} {
  const fields = issueFieldsFromStoredSnapshot(stored);
  if (!fields) {
    return { status: '', summary: '', type: '' };
  }
  const payload = fields as unknown as TrackerIssue;
  const status = payload.status?.key ?? payload.statusType?.key ?? '';
  const type = payload.type?.key ?? '';
  const summary = payload.summary ?? '';
  return { status, summary, type };
}
