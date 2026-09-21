import type { TrackerIssue } from '@/types/tracker';

import {
  readStringTokenFromUnknown,
  readUrlFieldValue,
} from './issueFieldValueHelpers';

export function readMergeRequestLinkValue(v: unknown): string {
  return readUrlFieldValue(v);
}

export function readStringTokenValue(v: unknown): string {
  return readStringTokenFromUnknown(v);
}

export function readUserRefFromValue(v: unknown): { display: string; id: string } | undefined {
  if (v && typeof v === 'object' && 'id' in v) {
    const user = v as { display?: string; id?: string };
    if (user.id) {
      return { display: user.display ?? user.id, id: user.id };
    }
  }
  return undefined;
}

function readIssueTagTokenFromEntry(t: unknown): string {
  if (typeof t === 'string') {
    return t.trim().toLowerCase();
  }
  if (t && typeof t === 'object') {
    const tag = t as { display?: string; id?: string; key?: string };
    return (tag.key ?? tag.id ?? tag.display ?? '').trim().toLowerCase();
  }
  return '';
}

export function readIssueTagTokensFromArray(tags: unknown[]): string[] {
  const out: string[] = [];
  for (const tag of tags) {
    const normalized = readIssueTagTokenFromEntry(tag);
    if (normalized) {
      out.push(normalized);
    }
  }
  return out;
}

export function readRawFieldValueFromIssue(
  issue: TrackerIssue,
  fieldId: string | undefined
): unknown {
  if (!fieldId) {
    return undefined;
  }
  const record = issue as unknown as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, fieldId)) {
    return record[fieldId];
  }
  const snake = fieldId.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  if (snake !== fieldId && Object.prototype.hasOwnProperty.call(record, snake)) {
    return record[snake];
  }
  return undefined;
}
