import type { IssueTrackerBurndownIssue } from './changelogTypes';
import type {
  IssueTrackerBurndownSprintContext,
  IssueTrackerIssue,
  IssueTrackerIssueChangelogWithComments,
} from './types';
import type { IssueComment } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import {
  buildIssueTrackerBurndownIssueFromPayloadAndLogs,
  changelogEntriesFromRawIssueLogs,
} from './changelogNormalizer';
import { yandexIssueFromProviderIssue } from './yandexTrackerProviderHelpers';

const CHANGELOG_PAGE = 100;
const CHANGELOG_BATCH = 8;
const BURNDOWN_BATCH = 6;

function isHttpNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  return (error as { response?: { status?: number } }).response?.status === 404;
}

export function extractJiraChangelogHistories(data: unknown): unknown[] {
  if (!data || typeof data !== 'object') {
    return [];
  }
  const rec = data as {
    changelog?: { histories?: unknown; values?: unknown };
    histories?: unknown;
    values?: unknown;
  };
  if (Array.isArray(rec.values)) {
    return rec.values;
  }
  if (Array.isArray(rec.histories)) {
    return rec.histories;
  }
  const nested = rec.changelog;
  if (nested && typeof nested === 'object') {
    if (Array.isArray(nested.histories)) {
      return nested.histories;
    }
    if (Array.isArray(nested.values)) {
      return nested.values;
    }
  }
  return [];
}

function jiraNameKey(name: string): string {
  return name.toLowerCase().replaceAll(/\s+/g, '');
}

function jiraChangelogFieldId(field: unknown): string | null {
  const name = String(field ?? '').trim().toLowerCase();
  if (name === 'status') {
    return 'status';
  }
  if (name === 'story points' || name === 'storypoints') {
    return 'storyPoints';
  }
  if (name === 'test points' || name === 'testpoints' || name === 'test point') {
    return 'testPoints';
  }
  return null;
}

function changelogFieldValue(
  id: unknown,
  display: unknown
): { display: string; id: string; key: string } | null {
  const label = String(display ?? id ?? '').trim();
  if (!label) {
    return null;
  }
  const key = jiraNameKey(label);
  return { display: label, id: String(id ?? key), key };
}

function mapJiraChangelogItem(item: unknown): {
  field: { display: string; id: string };
  from: { display: string; id: string; key: string } | null;
  to: { display: string; id: string; key: string } | null;
} | null {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const row = item as {
    field?: unknown;
    from?: unknown;
    fromString?: unknown;
    to?: unknown;
    toString?: unknown;
  };
  const fieldId = jiraChangelogFieldId(row.field);
  if (!fieldId) {
    return null;
  }
  const display = String(row.field ?? fieldId);
  return {
    field: { display, id: fieldId },
    from: changelogFieldValue(row.from, row.fromString),
    to: changelogFieldValue(row.to, row.toString),
  };
}

export function mapJiraChangelogHistoryToLog(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as {
    author?: { accountId?: string; displayName?: string; name?: string };
    created?: unknown;
    id?: unknown;
    items?: unknown;
  };
  const updatedAt = typeof row.created === 'string' ? row.created : '';
  if (!updatedAt) {
    return null;
  }
  const items = Array.isArray(row.items) ? row.items : [];
  const fields = items
    .map((item) => mapJiraChangelogItem(item))
    .filter((field): field is NonNullable<typeof field> => field !== null);
  const authorId = row.author?.accountId || row.author?.name || '';
  return {
    createdBy: {
      display: row.author?.displayName?.trim() || authorId,
      id: authorId,
    },
    fields,
    id: row.id != null ? String(row.id) : updatedAt,
    type: 'IssueUpdate',
    updatedAt,
  };
}

export function jiraChangelogLogsFromHistories(histories: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const history of histories) {
    const log = mapJiraChangelogHistoryToLog(history);
    if (log) {
      out.push(log);
    }
  }
  return out;
}

async function mapInChunks<T, R>(
  items: T[],
  chunkSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const part = await Promise.all(chunk.map(fn));
    out.push(...part);
  }
  return out;
}

async function fetchDedicatedChangelogPages(
  api: AxiosInstance,
  issueKey: string
): Promise<unknown[] | null> {
  const out: unknown[] = [];
  let startAt = 0;
  try {
    for (let page = 0; page < 40; page += 1) {
      const { data } = await api.get<unknown>(
        `/issue/${encodeURIComponent(issueKey)}/changelog`,
        { params: { maxResults: CHANGELOG_PAGE, startAt } }
      );
      const rows = extractJiraChangelogHistories(data);
      out.push(...rows);
      if (rows.length === 0 || rows.length < CHANGELOG_PAGE) {
        return out;
      }
      startAt += rows.length;
    }
    return out;
  } catch (error) {
    if (isHttpNotFound(error)) {
      return null;
    }
    throw error;
  }
}

async function fetchExpandChangelogHistories(
  api: AxiosInstance,
  issueKey: string
): Promise<unknown[]> {
  try {
    const { data } = await api.get<unknown>(`/issue/${encodeURIComponent(issueKey)}`, {
      params: { expand: 'changelog', fields: 'summary' },
    });
    return extractJiraChangelogHistories(data);
  } catch (error) {
    if (isHttpNotFound(error)) {
      return [];
    }
    throw error;
  }
}

async function fetchJiraIssueChangelogLogs(
  api: AxiosInstance,
  issueKey: string
): Promise<unknown[]> {
  const dedicated = await fetchDedicatedChangelogPages(api, issueKey);
  const histories = dedicated ?? (await fetchExpandChangelogHistories(api, issueKey));
  return jiraChangelogLogsFromHistories(histories);
}

function jiraCommentText(body: unknown): string {
  return typeof body === 'string' ? body : '';
}

function mapJiraComment(raw: unknown): IssueComment | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as {
    author?: { accountId?: string; displayName?: string; name?: string };
    body?: unknown;
    created?: unknown;
    id?: unknown;
    updated?: unknown;
    updateAuthor?: { displayName?: string; name?: string; accountId?: string };
  };
  const createdAt = typeof row.created === 'string' ? row.created : '';
  if (!createdAt) {
    return null;
  }
  const authorId = row.author?.accountId || row.author?.name || '';
  const updatedById =
    row.updateAuthor?.accountId || row.updateAuthor?.name || '';
  const numericId = Number.parseInt(String(row.id ?? ''), 10);
  return {
    createdAt,
    createdBy: {
      display: row.author?.displayName?.trim() || authorId || 'Unknown',
      id: authorId,
    },
    id: Number.isFinite(numericId) ? numericId : 0,
    text: jiraCommentText(row.body),
    updatedAt: typeof row.updated === 'string' ? row.updated : createdAt,
    updatedBy: updatedById
      ? {
          display: row.updateAuthor?.displayName?.trim() || updatedById,
          id: updatedById,
        }
      : undefined,
  };
}

function extractJiraCommentRows(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object' && Array.isArray((data as { comments?: unknown }).comments)) {
    return (data as { comments: unknown[] }).comments;
  }
  return [];
}

async function fetchJiraIssueComments(
  api: AxiosInstance,
  issueKey: string
): Promise<IssueComment[]> {
  try {
    const { data } = await api.get<unknown>(`/issue/${encodeURIComponent(issueKey)}/comment`, {
      params: { maxResults: 1000 },
    });
    const out: IssueComment[] = [];
    for (const row of extractJiraCommentRows(data)) {
      const mapped = mapJiraComment(row);
      if (mapped) {
        out.push(mapped);
      }
    }
    return out.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  } catch (error) {
    if (isHttpNotFound(error)) {
      return [];
    }
    throw error;
  }
}

export async function fetchJiraIssueChangelogWithComments(
  api: AxiosInstance,
  issueKey: string
): Promise<IssueTrackerIssueChangelogWithComments> {
  const [changelogLogs, comments] = await Promise.all([
    fetchJiraIssueChangelogLogs(api, issueKey),
    fetchJiraIssueComments(api, issueKey),
  ]);
  return {
    changelog: changelogEntriesFromRawIssueLogs(changelogLogs),
    comments,
  };
}

export async function fetchJiraIssuesChangelogBatch(
  api: AxiosInstance,
  issueKeys: string[]
): Promise<Record<string, IssueTrackerIssueChangelogWithComments>> {
  const uniqueKeys = [...new Set(issueKeys.map((key) => key.trim()).filter(Boolean))];
  const results = await mapInChunks(uniqueKeys, CHANGELOG_BATCH, async (key) => ({
    data: await fetchJiraIssueChangelogWithComments(api, key),
    key,
  }));
  const out: Record<string, IssueTrackerIssueChangelogWithComments> = {};
  for (const { data, key } of results) {
    out[key] = data;
  }
  for (const key of issueKeys) {
    if (!out[key]) {
      out[key] = { changelog: [], comments: [] };
    }
  }
  return out;
}

export function fetchJiraBurndownIssuesForKeys(
  api: AxiosInstance,
  issueKeys: string[],
  sprint: IssueTrackerBurndownSprintContext | undefined,
  issueByKey: ReadonlyMap<string, IssueTrackerIssue>
): Promise<IssueTrackerBurndownIssue[]> {
  if (issueKeys.length === 0) {
    return Promise.resolve([]);
  }
  return mapInChunks(issueKeys, BURNDOWN_BATCH, async (key) => {
    const issue = issueByKey.get(key);
    const payload = issue ? yandexIssueFromProviderIssue(issue) : { key };
    let rawLogs: unknown[] = [];
    try {
      rawLogs = await fetchJiraIssueChangelogLogs(api, key);
    } catch (error) {
      if (!isHttpNotFound(error)) {
        throw error;
      }
    }
    return buildIssueTrackerBurndownIssueFromPayloadAndLogs(payload, rawLogs, sprint, key);
  });
}

export async function addJiraIssueComment(
  api: AxiosInstance,
  issueKey: string,
  text: string
): Promise<void> {
  await api.post(`/issue/${encodeURIComponent(issueKey)}/comment`, { body: text });
}
