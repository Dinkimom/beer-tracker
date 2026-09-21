/**
 * Provider-neutral нормализация changelog и burndown issue из сырого provider payload.
 */

import type {
  IssueTrackerBurndownChangelogEntry,
  IssueTrackerBurndownIssue,
  IssueTrackerChangelogEntry,
} from './changelogTypes';
import type { IssueTrackerBurndownSprintContext } from './types';
import type { ChangelogEntry } from '@/types/tracker';

import { issueDataSprintContains } from '@/lib/burndown/sprintMembership';
import { mapStatus } from '@/utils/statusMapper';

import { processChangelogToDoneEvents } from './changelogDoneEventsHelpers';
import { normalizeChangelogFields, parseChangelogAuthor } from './changelogNormalizerHelpers';

interface NormalizedChangelogEntry {
  createdBy?: {
    display?: string;
    id?: string;
  };
  fields?: Array<{
    field: { display?: string; id: string };
    from?: { display?: string; id?: string; key?: string } | null;
    to?: { display?: string; id?: string; key?: string } | null;
  }>;
  id?: string;
  type?: string;
  updatedAt: string;
}

interface NormalizedIssueData {
  key: string;
  statusKey: string;
  storyPoints: number;
  testPoints: number;
}

function adaptChangelogEntry(raw: unknown): NormalizedChangelogEntry | null {
  if (!raw || typeof raw !== 'object') return null;

  const entry = raw as Record<string, unknown>;
  const updatedAt =
    (entry.updatedAt as string) ?? (entry.updated_at as string) ?? '';
  if (!updatedAt) return null;

  const fields = entry.fields as NormalizedChangelogEntry['fields'];
  const id = (entry.id as string) ?? (entry.updatedAt as string) ?? '';
  const type = (entry.type as string) ?? 'IssueUpdate';

  const authorRaw =
    entry.updatedBy ?? entry.updated_by ?? entry.createdBy ?? entry.created_by ?? entry.author;
  const createdBy = parseChangelogAuthor(authorRaw);

  const normalizedFields = normalizeChangelogFields(fields);

  return {
    createdBy,
    fields: normalizedFields,
    id,
    type,
    updatedAt,
  };
}

function adaptIssueData(raw: unknown): NormalizedIssueData {
  if (!raw || typeof raw !== 'object') {
    return { key: '', statusKey: '', storyPoints: 0, testPoints: 0 };
  }

  const data = raw as Record<string, unknown>;
  const key = (data.key as string) || (data.id as string) || '';
  const storyPoints = (data.storyPoints as number) ?? (data.story_points as number) ?? 0;
  const testPoints = (data.testPoints as number) ?? (data.test_points as number) ?? 0;

  let statusKey = '';
  const status = data.status as Record<string, string> | undefined;
  if (status) {
    statusKey = status.key ?? status.display ?? '';
  }

  return { key, statusKey, storyPoints, testPoints };
}

function processChangelogToDoneEventsLocal(
  entries: NormalizedChangelogEntry[]
): Array<{ date: string; isDone: boolean }> {
  return processChangelogToDoneEvents(entries, mapStatus);
}

function toChangelogFieldValue(
  v: unknown
): { display: string; id: string; key: string } | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') {
    const s = String(v);
    return { display: s, id: s, key: s };
  }
  if (typeof v === 'object' && v !== null && 'key' in v) {
    const o = v as Record<string, unknown>;
    const key = String(o.key ?? o.display ?? '');
    return { display: String(o.display ?? key), id: String(o.id ?? key), key };
  }
  return null;
}

function normalizeToChangelogEntry(entry: NormalizedChangelogEntry): IssueTrackerChangelogEntry | null {
  const allowedIds = new Set(['status', 'storyPoints', 'testPoints']);
  const relevantFields = entry.fields?.filter((f) => f?.field?.id && allowedIds.has(f.field.id));
  if (!relevantFields || relevantFields.length === 0) return null;

  const fields = relevantFields.map((field) => ({
    field: {
      display: field.field.display || field.field.id,
      id: field.field.id,
    },
    from: toChangelogFieldValue(field.from),
    to: toChangelogFieldValue(field.to),
  }));

  return {
    createdBy: entry.createdBy,
    fields,
    id: entry.id || entry.updatedAt,
    type: entry.type || 'IssueUpdate',
    updatedAt: entry.updatedAt,
  };
}

/** Сырой массив issue logs → нормализованные записи changelog для UI. */
export function changelogEntriesFromRawIssueLogs(rawLogs: unknown): IssueTrackerChangelogEntry[] {
  const arr = Array.isArray(rawLogs) ? rawLogs : [];
  const normalizedEntries = arr
    .map(adaptChangelogEntry)
    .filter((e): e is NormalizedChangelogEntry => e !== null)
    .sort(
      (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    );
  return normalizedEntries
    .map(normalizeToChangelogEntry)
    .filter((e): e is ChangelogEntry => e !== null);
}

/** Собирает burndown issue из payload задачи и сырого changelog provider API. */
export function buildIssueTrackerBurndownIssueFromPayloadAndLogs(
  issuePayload: unknown,
  rawLogs: unknown,
  sprint: IssueTrackerBurndownSprintContext | undefined,
  fallbackIssueKey: string
): IssueTrackerBurndownIssue {
  const issueData = adaptIssueData(issuePayload);
  const inCurrentSprint = sprint
    ? issueDataSprintContains(issuePayload, sprint.sprintName, sprint.sprintId)
    : true;
  const rawLogsArr = Array.isArray(rawLogs) ? rawLogs : [];
  const normalizedEntries = rawLogsArr
    .map(adaptChangelogEntry)
    .filter((e): e is NormalizedChangelogEntry => e !== null)
    .sort(
      (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    );
  const changelog = processChangelogToDoneEventsLocal(normalizedEntries);
  const rawChangelog: IssueTrackerBurndownChangelogEntry[] = normalizedEntries.map((e) => ({
    fields: e.fields?.map((f) => ({
      field: f.field,
      from: (f as { from?: unknown }).from,
      to: (f as { to?: unknown }).to,
    })),
    id: e.id,
    type: e.type,
    updatedAt: e.updatedAt,
  }));

  return {
    changelog,
    inCurrentSprint,
    issueKey: issueData.key || fallbackIssueKey,
    rawChangelog,
    statusKey: issueData.statusKey,
    storyPoints: issueData.storyPoints,
    testPoints: issueData.testPoints,
  };
}
