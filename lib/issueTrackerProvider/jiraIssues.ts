import type { IssueTrackerIssue } from './types';
import type { TrackerIssue } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { jiraAdfToMarkdown } from './jiraAdfToMarkdown';
import { jiraAgileSprintIssuesUrl, shouldStopJiraBoardPages } from './jiraCatalog';
import { jiraNameKey, mapJiraStatus, mapJiraStatusCategory } from './jiraStatusKeys';

export { mapJiraStatus } from './jiraStatusKeys';

/** JQL `fields`: `*all` so admin-mapped customfields (SP/TP and others) are returned. */
const JIRA_SPRINT_ISSUE_FIELDS = ['*all'] as const;

/** REST keys already mapped onto TrackerIssue — skip bulky system blobs. */
const JIRA_REST_STRUCTURED_FIELD_KEYS = new Set([
  'assignee',
  'attachment',
  'closedSprints',
  'comment',
  'created',
  'description',
  'duedate',
  'epic',
  'issuelinks',
  'issuetype',
  'parent',
  'priority',
  'project',
  'sprint',
  'status',
  'subtasks',
  'summary',
  'thumbnail',
  'timetracking',
  'updated',
  'votes',
  'watches',
  'worklog',
]);

const JIRA_TRACKER_ISSUE_KNOWN_KEYS = new Set([
  'assignee',
  'createdAt',
  'deadline',
  'description',
  'epic',
  'id',
  'key',
  'parent',
  'priority',
  'queue',
  'self',
  'sprint',
  'start',
  'status',
  'statusType',
  'storyPoints',
  'summary',
  'testPoints',
  'type',
  'updatedAt',
]);

const GH_SPRINT_ID = /(?:^|[,[])id=(\d+)/;
const GH_SPRINT_NAME = /(?:^|[,[])name=([^,\]]+)/;

interface JiraUserRaw {
  accountId?: string;
  displayName?: string;
  key?: string;
  name?: string;
}

interface JiraNamedRef {
  id?: unknown;
  key?: string;
  name?: string;
}

interface JiraIssueFieldsRaw {
  assignee?: JiraUserRaw | null;
  closedSprints?: unknown;
  created?: string;
  description?: unknown;
  duedate?: string | null;
  epic?: unknown;
  issuetype?: JiraNamedRef;
  parent?: { fields?: { summary?: string }; id?: unknown; key?: string; self?: string };
  priority?: JiraNamedRef;
  project?: JiraNamedRef;
  sprint?: unknown;
  status?: JiraNamedRef & { statusCategory?: { key?: string; name?: string } };
  summary?: string;
  updated?: string;
}

interface JiraIssueRaw {
  fields?: JiraIssueFieldsRaw;
  id?: unknown;
  key?: string;
  self?: string;
}

export function extractJiraIssueRows(data: unknown): unknown[] {
  if (!data || typeof data !== 'object') {
    return [];
  }
  const page = data as { issues?: unknown };
  return Array.isArray(page.issues) ? page.issues : [];
}

function sprintRefFromObject(row: Record<string, unknown>): { display: string; id: string } | null {
  const id = row.id != null && String(row.id).trim() !== '' ? String(row.id) : '';
  if (!id) {
    return null;
  }
  const name =
    (typeof row.name === 'string' && row.name.trim()) ||
    (typeof row.display === 'string' && row.display.trim()) ||
    id;
  return { display: name, id };
}

function sprintRefsFromGreenhopperString(raw: string): Array<{ display: string; id: string }> {
  const idMatch = GH_SPRINT_ID.exec(raw);
  if (!idMatch?.[1]) {
    return [];
  }
  const nameMatch = GH_SPRINT_NAME.exec(raw);
  const name = nameMatch?.[1]?.trim();
  return [{ display: name || idMatch[1], id: idMatch[1] }];
}

function collectSprintRefs(raw: unknown, out: Map<string, { display: string; id: string }>): void {
  if (raw == null) {
    return;
  }
  if (typeof raw === 'string') {
    for (const ref of sprintRefsFromGreenhopperString(raw)) {
      out.set(ref.id, ref);
    }
    return;
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      collectSprintRefs(item, out);
    }
    return;
  }
  if (typeof raw === 'object') {
    const ref = sprintRefFromObject(raw as Record<string, unknown>);
    if (ref) {
      out.set(ref.id, ref);
    }
  }
}

export function mapJiraSprintField(
  fields: Pick<JiraIssueFieldsRaw, 'closedSprints' | 'sprint'>
): TrackerIssue['sprint'] {
  const byId = new Map<string, { display: string; id: string }>();
  collectSprintRefs(fields.sprint, byId);
  collectSprintRefs(fields.closedSprints, byId);
  const refs = [...byId.values()];
  return refs.length > 0 ? refs : undefined;
}

function mapJiraUser(raw: JiraUserRaw | null | undefined): TrackerIssue['assignee'] {
  if (!raw) {
    return undefined;
  }
  const id = raw.accountId?.trim() || raw.name?.trim() || raw.key?.trim() || '';
  if (!id) {
    return undefined;
  }
  return { display: raw.displayName?.trim() || id, id };
}

function mapJiraType(issuetype: JiraNamedRef | undefined): TrackerIssue['type'] {
  const display = issuetype?.name?.trim() || 'Task';
  return { display, key: jiraNameKey(display) };
}

function mapJiraParent(parent: JiraIssueFieldsRaw['parent']): TrackerIssue['parent'] {
  const key = parent?.key?.trim();
  if (!parent || !key) {
    return undefined;
  }
  const display = parent.fields?.summary?.trim() || key;
  return {
    display,
    id: parent.id != null ? String(parent.id) : key,
    key,
    self: parent.self ?? '',
  };
}

function mapJiraEpic(raw: unknown): TrackerIssue['epic'] {
  if (typeof raw === 'string' && raw.trim()) {
    const key = raw.trim();
    return { display: key, id: key, key, self: '' };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const row = raw as { id?: unknown; key?: string; name?: string; self?: string; summary?: string };
  const key = row.key?.trim();
  if (!key) {
    return undefined;
  }
  const display = row.name?.trim() || row.summary?.trim() || key;
  return {
    display,
    id: row.id != null ? String(row.id) : key,
    key,
    self: row.self ?? '',
  };
}

function mapJiraDescription(raw: unknown): string | undefined {
  if (typeof raw === 'string') {
    const text = raw.trim();
    return text || undefined;
  }
  // Jira Cloud REST API v3 returns ADF objects for rich-text fields.
  const fromAdf = jiraAdfToMarkdown(raw);
  return fromAdf || undefined;
}

function extractJiraExtraFields(fields: JiraIssueFieldsRaw): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
    if (value === undefined || JIRA_REST_STRUCTURED_FIELD_KEYS.has(key)) {
      continue;
    }
    out[key] = value;
  }
  return out;
}

function extractJiraTrackerIssueCustomFields(issue: TrackerIssue): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(issue as unknown as Record<string, unknown>)) {
    if (!JIRA_TRACKER_ISSUE_KNOWN_KEYS.has(key)) {
      out[key] = value;
    }
  }
  return out;
}

function mapJiraQueue(project: JiraNamedRef | undefined, issueKey: string): TrackerIssue['queue'] {
  const key = project?.key?.trim() || issueKey.split('-')[0] || '';
  if (!key) {
    return undefined;
  }
  const display = project?.name?.trim() || key;
  return { display, id: key, key, self: '' };
}

function mapJiraPriority(priority: JiraNamedRef | undefined): TrackerIssue['priority'] {
  const display = priority?.name?.trim();
  if (!display) {
    return undefined;
  }
  return { display, key: jiraNameKey(display) };
}

export function mapJiraRestIssueToTrackerIssue(raw: unknown): TrackerIssue | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as JiraIssueRaw;
  const key = row.key?.trim();
  if (!key) {
    return null;
  }
  const fields = row.fields ?? {};
  const id = row.id != null && String(row.id).trim() !== '' ? String(row.id) : key;
  const epic = mapJiraEpic(fields.epic);
  const duedate = typeof fields.duedate === 'string' ? fields.duedate.trim() : '';
  return {
    ...extractJiraExtraFields(fields),
    assignee: mapJiraUser(fields.assignee),
    createdAt: fields.created,
    ...(duedate ? { deadline: duedate } : {}),
    description: mapJiraDescription(fields.description),
    ...(epic ? { epic } : {}),
    id,
    key,
    parent: mapJiraParent(fields.parent),
    priority: mapJiraPriority(fields.priority),
    queue: mapJiraQueue(fields.project, key),
    self: typeof row.self === 'string' ? row.self : '',
    sprint: mapJiraSprintField(fields),
    status: mapJiraStatus(fields.status),
    statusType: mapJiraStatusCategory(fields.status?.statusCategory),
    summary: fields.summary?.trim() || key,
    type: mapJiraType(fields.issuetype),
    updatedAt: fields.updated,
  };
}

export function normalizeJiraIssue(issue: TrackerIssue): IssueTrackerIssue {
  return {
    assignee: issue.assignee,
    createdAt: issue.createdAt,
    customFields: extractJiraTrackerIssueCustomFields(issue),
    dangerousRelease: issue.dangerousRelease,
    deadline: issue.deadline,
    description: issue.description,
    epic: issue.epic,
    functionalTeam: issue.functionalTeam,
    id: issue.id,
    incidentSeverity: issue.incidentSeverity,
    key: issue.key,
    mergeRequestLink: issue.MergeRequestLink,
    parent: issue.parent,
    priority: issue.priority,
    productTeam: issue.bizErpTeam,
    provider: 'jira',
    qaEngineer: issue.qaEngineer,
    raw: issue,
    self: issue.self,
    sprint: issue.sprint,
    stage: issue.stage,
    start: issue.start,
    status: issue.status,
    statusType: issue.statusType,
    storyPoints: issue.storyPoints,
    summary: issue.summary,
    testPoints: issue.testPoints,
    type: issue.type,
    updatedAt: issue.updatedAt,
  };
}

const JIRA_ISSUE_PAGE_SIZE = 50;
const JIRA_ISSUE_MAX_PAGES = 40;

function trackerIssuesFromJiraPageData(data: unknown): TrackerIssue[] {
  const out: TrackerIssue[] = [];
  for (const row of extractJiraIssueRows(data)) {
    const mapped = mapJiraRestIssueToTrackerIssue(row);
    if (mapped) {
      out.push(mapped);
    }
  }
  return out;
}

function jiraSearchTotalPages(data: unknown, startAt: number, maxResults: number): number {
  if (data && typeof data === 'object' && typeof (data as { total?: unknown }).total === 'number') {
    return Math.max(1, Math.ceil((data as { total: number }).total / maxResults));
  }
  return Math.floor(startAt / maxResults) + 1;
}

function appendMappedJiraIssues(
  issues: TrackerIssue[],
  mapped: TrackerIssue[],
  maxTotal: number
): boolean {
  const room = maxTotal - issues.length;
  issues.push(...mapped.slice(0, room));
  return mapped.length > room;
}

export async function collectPagedJiraRestIssues(
  requestPage: (startAt: number, maxResults: number) => Promise<unknown>,
  options?: {
    maxResults?: number;
    maxTotal?: number;
    onCheckpoint?: (info: {
      page: number;
      totalIssues: number;
      totalPages: number;
    }) => Promise<void> | void;
  }
): Promise<{ issues: TrackerIssue[]; truncated: boolean }> {
  const maxResults = options?.maxResults ?? JIRA_ISSUE_PAGE_SIZE;
  const maxTotal = options?.maxTotal ?? Number.POSITIVE_INFINITY;
  const issues: TrackerIssue[] = [];
  let startAt = 0;
  for (let page = 0; page < JIRA_ISSUE_MAX_PAGES; page += 1) {
    if (issues.length >= maxTotal) {
      return { issues, truncated: true };
    }
    const data = await requestPage(startAt, maxResults);
    if (appendMappedJiraIssues(issues, trackerIssuesFromJiraPageData(data), maxTotal)) {
      return { issues, truncated: true };
    }
    await options?.onCheckpoint?.({
      page: page + 1,
      totalIssues: issues.length,
      totalPages: jiraSearchTotalPages(data, startAt, maxResults),
    });
    const rows = extractJiraIssueRows(data);
    if (shouldStopJiraBoardPages(data, startAt, rows.length, maxResults)) {
      return { issues, truncated: false };
    }
    startAt += rows.length;
  }
  return { issues, truncated: true };
}

async function fetchPagedJiraIssueData(
  requestPage: (startAt: number, maxResults: number) => Promise<unknown>
): Promise<TrackerIssue[]> {
  const { issues } = await collectPagedJiraRestIssues(requestPage, {
    maxResults: JIRA_ISSUE_PAGE_SIZE,
  });
  return issues;
}

async function fetchAgileSprintIssues(
  api: AxiosInstance,
  sprintId: number
): Promise<TrackerIssue[] | null> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl) {
    return null;
  }
  try {
    return await fetchPagedJiraIssueData(async (startAt, maxResults) => {
      const { data } = await api.get<unknown>(jiraAgileSprintIssuesUrl(baseUrl, sprintId), {
        params: { fields: '*all', maxResults, startAt },
      });
      return data;
    });
  } catch {
    return null;
  }
}

function fetchJqlSprintIssues(api: AxiosInstance, sprintId: number): Promise<TrackerIssue[]> {
  return fetchPagedJiraIssueData(async (startAt, maxResults) => {
    const { data } = await api.post<unknown>('/search', {
      fields: [...JIRA_SPRINT_ISSUE_FIELDS],
      jql: `sprint = ${sprintId}`,
      maxResults,
      startAt,
    });
    return data;
  });
}

export async function searchJiraIssuesInSprint(
  api: AxiosInstance,
  sprintId: number
): Promise<TrackerIssue[]> {
  const agile = await fetchAgileSprintIssues(api, sprintId);
  if (agile !== null) {
    return agile;
  }
  return fetchJqlSprintIssues(api, sprintId);
}

function jiraIssuePath(issueKey: string): string {
  return `/issue/${encodeURIComponent(issueKey)}`;
}

function isHttpNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  return (error as { response?: { status?: number } }).response?.status === 404;
}

export async function fetchJiraIssue(
  api: AxiosInstance,
  issueKey: string
): Promise<IssueTrackerIssue | null> {
  const key = issueKey.trim();
  if (!key) {
    return null;
  }
  try {
    const { data } = await api.get<unknown>(jiraIssuePath(key));
    const mapped = mapJiraRestIssueToTrackerIssue(data);
    return mapped ? normalizeJiraIssue(mapped) : null;
  } catch (error) {
    if (isHttpNotFound(error)) {
      return null;
    }
    throw error;
  }
}
