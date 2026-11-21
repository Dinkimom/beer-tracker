import type { IssueTrackerBurndownIssue } from './changelogTypes';
import type {
  IssueTrackerBurndownSprintContext,
  IssueTrackerIssue,
  IssueTrackerIssueChangelogWithComments,
} from './types';
import type { IssueComment } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { mapInChunks } from '@/lib/mapInChunks';

import {
  buildIssueTrackerBurndownIssueFromPayloadAndLogs,
  changelogEntriesFromRawIssueLogs,
} from './changelogNormalizer';
import { jiraAdfToMarkdown } from './jiraAdfToMarkdown';
import { axiosErrorStatusAndDetails } from './jiraAgileAuthError';
import { JIRA_START_DATE_FIELD_NAMES } from './jiraScheduleFields';
import { yandexIssueFromProviderIssue } from './yandexTrackerProviderHelpers';

const CHANGELOG_PAGE = 100;
const CHANGELOG_BATCH = 8;
const BURNDOWN_BATCH = 6;


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

/**
 * Какие поля changelog нужны потребителю: burndown считает только статус и оценки;
 * кеш changelog (строка факта, история спринта) — ещё спринт, исполнителя и сроки.
 */
type JiraChangelogScope = 'burndown' | 'history';

const BURNDOWN_FIELD_IDS: ReadonlySet<string> = new Set(['status', 'storyPoints', 'testPoints']);

/** Имя поля Jira (lowercase) → id поля в Yandex-shaped changelog. */
const JIRA_FIELD_NAME_TO_ID: ReadonlyMap<string, string> = new Map([
  ['assignee', 'assignee'],
  ['due date', 'deadline'],
  ['duedate', 'deadline'],
  ['sprint', 'sprint'],
  ['status', 'status'],
  ['story points', 'storyPoints'],
  ['storypoints', 'storyPoints'],
  ['test point', 'testPoints'],
  ['test points', 'testPoints'],
  ['testpoints', 'testPoints'],
  ...[...JIRA_START_DATE_FIELD_NAMES].map((name): [string, string] => [name, 'start']),
]);

function jiraChangelogFieldId(field: unknown, fieldId: unknown): string | null {
  const name = String(field ?? '').trim().toLowerCase();
  if (String(fieldId ?? '').trim() === 'duedate') {
    return 'deadline';
  }
  return JIRA_FIELD_NAME_TO_ID.get(name) ?? null;
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

/** Дата как у Yandex: строка YYYY-MM-DD (у `duedate` она в from/to, у custom-поля — в *String). */
function changelogDateValue(raw: unknown, rawString: unknown): string | null {
  const text = String(raw ?? rawString ?? '').trim();
  const match = /^\d{4}-\d{2}-\d{2}/.exec(text);
  return match ? match[0] : null;
}

/** Спринты как у Yandex: массив `{ id, display }`; Jira отдаёт id и имена через запятую. */
function changelogSprintValue(raw: unknown, rawString: unknown): Array<{ display: string; id: string }> | null {
  const ids = String(raw ?? '').split(',').map((part) => part.trim()).filter(Boolean);
  if (ids.length === 0) {
    return null;
  }
  const names = String(rawString ?? '').split(', ').map((part) => part.trim());
  const namesMatch = names.length === ids.length;
  return ids.map((id, index) => ({ display: namesMatch ? names[index]! : id, id }));
}

interface JiraChangelogItemRow {
  field?: unknown;
  fieldId?: unknown;
  from?: unknown;
  fromString?: unknown;
  to?: unknown;
  toString?: unknown;
}

function changelogItemValues(fieldId: string, row: JiraChangelogItemRow): { from: unknown; to: unknown } {
  if (fieldId === 'start' || fieldId === 'deadline') {
    return {
      from: changelogDateValue(row.from, row.fromString),
      to: changelogDateValue(row.to, row.toString),
    };
  }
  if (fieldId === 'sprint') {
    return {
      from: changelogSprintValue(row.from, row.fromString),
      to: changelogSprintValue(row.to, row.toString),
    };
  }
  return {
    from: changelogFieldValue(row.from, row.fromString),
    to: changelogFieldValue(row.to, row.toString),
  };
}

function mapJiraChangelogItem(
  item: unknown,
  scope: JiraChangelogScope
): { field: { display: string; id: string }; from: unknown; to: unknown } | null {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const row = item as JiraChangelogItemRow;
  const fieldId = jiraChangelogFieldId(row.field, row.fieldId);
  if (!fieldId || (scope === 'burndown' && !BURNDOWN_FIELD_IDS.has(fieldId))) {
    return null;
  }
  return {
    field: { display: String(row.field ?? fieldId), id: fieldId },
    ...changelogItemValues(fieldId, row),
  };
}

export function mapJiraChangelogHistoryToLog(
  raw: unknown,
  scope: JiraChangelogScope = 'history'
): Record<string, unknown> | null {
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
    .map((item) => mapJiraChangelogItem(item, scope))
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

export function jiraChangelogLogsFromHistories(
  histories: unknown[],
  scope: JiraChangelogScope = 'history'
): unknown[] {
  const out: unknown[] = [];
  for (const history of histories) {
    const log = mapJiraChangelogHistoryToLog(history, scope);
    if (log) {
      out.push(log);
    }
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
    if (axiosErrorStatusAndDetails(error).status === 404) {
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
    if (axiosErrorStatusAndDetails(error).status === 404) {
      return [];
    }
    throw error;
  }
}

async function fetchJiraIssueChangelogLogs(
  api: AxiosInstance,
  issueKey: string,
  scope: JiraChangelogScope
): Promise<unknown[]> {
  const dedicated = await fetchDedicatedChangelogPages(api, issueKey);
  const histories = dedicated ?? (await fetchExpandChangelogHistories(api, issueKey));
  return jiraChangelogLogsFromHistories(histories, scope);
}

function jiraCommentText(body: unknown): string {
  if (typeof body === 'string') {
    return body;
  }
  // Jira Cloud REST API v3: comment body is ADF, not a string.
  return jiraAdfToMarkdown(body);
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
    if (axiosErrorStatusAndDetails(error).status === 404) {
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
    fetchJiraIssueChangelogLogs(api, issueKey, 'history'),
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
      rawLogs = await fetchJiraIssueChangelogLogs(api, key, 'burndown');
    } catch (error) {
      if (axiosErrorStatusAndDetails(error).status !== 404) {
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
