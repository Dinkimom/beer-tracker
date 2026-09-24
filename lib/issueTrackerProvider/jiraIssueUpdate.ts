import type { IssueTrackerIssuePatch } from './types';
import type { AxiosInstance } from 'axios';

import { getIssueTrackerProviderKind } from '@/lib/env';
import { extractTrackerMetadataArray } from '@/lib/trackerIntegration/fetchTrackerOrgMetadataHelpers';

import { splitIssueTrackerIssuePatch } from './issueTrackerIssuePatch';
import { jiraAgileIssueEstimationUrl, jiraAgileIssueUrl } from './jiraCatalog';
import { putJiraIssueParent } from './jiraIssueParent';
import { applyJiraScheduleFields } from './jiraScheduleFields';
import { jiraUserSearchRequestParams } from './jiraUserSearch';

const GH_RAPID_VIEW_ID = /(?:^|[,[])rapidViewId=(\d+)/;
const STORY_POINTS_SCHEMA = 'jsw-story-points';
const TEST_POINTS_FIELD_NAMES = ['test points', 'test point'] as const;

interface JiraFieldCatalogRow {
  id?: string;
  key?: string;
  name?: string;
  schema?: { custom?: string };
}

export function splitJiraIssueUpdatePatch(patch: Record<string, unknown>): {
  fields: Record<string, unknown>;
  storyPoints?: unknown;
  testPoints?: unknown;
} {
  const { storyPoints, testPoints, ...fields } = patch;
  const out: {
    fields: Record<string, unknown>;
    storyPoints?: unknown;
    testPoints?: unknown;
  } = { fields };
  if ('storyPoints' in patch) {
    out.storyPoints = storyPoints;
  }
  if ('testPoints' in patch) {
    out.testPoints = testPoints;
  }
  return out;
}

function positiveBoardId(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.trunc(raw);
  }
  if (typeof raw === 'string' && /^[1-9]\d{0,9}$/.test(raw.trim())) {
    return Number.parseInt(raw.trim(), 10);
  }
  return null;
}

function boardIdFromSprintObject(row: Record<string, unknown>): number | null {
  return (
    positiveBoardId(row.originBoardId) ??
    positiveBoardId(row.rapidViewId) ??
    positiveBoardId(row.boardId)
  );
}

function boardIdFromSprintString(raw: string): number | null {
  const match = GH_RAPID_VIEW_ID.exec(raw);
  return match?.[1] ? Number(match[1]) : null;
}

export function extractJiraEstimationBoardId(raw: unknown): number | null {
  if (raw == null) {
    return null;
  }
  if (typeof raw === 'string') {
    return boardIdFromSprintString(raw);
  }
  if (Array.isArray(raw)) {
    return firstBoardIdInList(raw);
  }
  if (typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  return (
    boardIdFromSprintObject(row) ??
    extractJiraEstimationBoardId(row.sprint) ??
    extractJiraEstimationBoardId(row.closedSprints) ??
    extractJiraEstimationBoardId(row.fields)
  );
}

function firstBoardIdInList(items: unknown[]): number | null {
  for (const item of items) {
    const id = extractJiraEstimationBoardId(item);
    if (id) {
      return id;
    }
  }
  return null;
}

function fieldCatalogId(row: JiraFieldCatalogRow): string | null {
  const id = row.id?.trim() || row.key?.trim();
  return id || null;
}

export function pickJiraStoryPointsFieldId(fields: unknown[]): string | null {
  let byName: string | null = null;
  for (const raw of fields) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const row = raw as JiraFieldCatalogRow;
    const id = fieldCatalogId(row);
    if (!id) {
      continue;
    }
    if ((row.schema?.custom ?? '').includes(STORY_POINTS_SCHEMA)) {
      return id;
    }
    const name = (row.name ?? '').trim().toLowerCase();
    if (!byName && (name === 'story points' || name === 'story point estimate')) {
      byName = id;
    }
  }
  return byName;
}

export function pickJiraNamedNumberFieldId(
  fields: unknown[],
  names: readonly string[]
): string | null {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const raw of fields) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const row = raw as JiraFieldCatalogRow;
    const id = fieldCatalogId(row);
    const name = (row.name ?? '').trim().toLowerCase();
    if (id && wanted.has(name)) {
      return id;
    }
  }
  return null;
}

function jiraIssuePath(issueKey: string): string {
  return `/issue/${encodeURIComponent(issueKey)}`;
}

function agileEstimationValue(value: unknown): string {
  return value == null ? '' : String(value);
}

async function readBoardIdFromGet(
  api: AxiosInstance,
  url: string,
  config?: { params?: Record<string, string> }
): Promise<number | null> {
  try {
    const { data } = config ? await api.get<unknown>(url, config) : await api.get<unknown>(url);
    return extractJiraEstimationBoardId(data);
  } catch {
    return null;
  }
}

async function loadEstimationBoardId(api: AxiosInstance, issueKey: string): Promise<number | null> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (baseUrl) {
    const fromAgile = await readBoardIdFromGet(api, jiraAgileIssueUrl(baseUrl, issueKey));
    if (fromAgile) {
      return fromAgile;
    }
  }
  return readBoardIdFromGet(api, jiraIssuePath(issueKey), {
    params: { fields: 'sprint,closedSprints' },
  });
}

async function fetchJiraFieldCatalog(api: AxiosInstance): Promise<unknown[]> {
  const { data } = await api.get<unknown>('/field');
  return extractTrackerMetadataArray(data);
}

async function putJiraAgileEstimation(
  api: AxiosInstance,
  issueKey: string,
  value: unknown,
  boardId: number
): Promise<void> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  await api.put(
    jiraAgileIssueEstimationUrl(baseUrl, issueKey),
    { value: agileEstimationValue(value) },
    { params: { boardId } }
  );
}

function extractJiraUserId(value: unknown): string | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'string') {
    const id = value.trim();
    return id.length > 0 ? id : null;
  }
  if (typeof value !== 'object') {
    return null;
  }
  const row = value as Record<string, unknown>;
  for (const key of ['accountId', 'name', 'key', 'id'] as const) {
    const raw = row[key];
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }
  }
  return null;
}

function looksLikeJiraAccountId(id: string): boolean {
  return id.includes(':') || /^[0-9a-f]{24}$/i.test(id);
}

export function jiraAssigneePutBody(value: unknown): { accountId?: string; name?: string | null } {
  const id = extractJiraUserId(value);
  if (!id) {
    return { name: null };
  }
  if (looksLikeJiraAccountId(id)) {
    return { accountId: id };
  }
  return { name: id };
}

function isYandexUserRef(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === 'id' && typeof (value as { id: unknown }).id === 'string';
}

function normalizeJiraUserShapedFields(fields: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    next[key] = isYandexUserRef(value) ? jiraAssigneePutBody(value) : value;
  }
  return next;
}

function jiraAssigneeFieldFromDomainPatch(assigneeField: string | undefined, isQa?: boolean): string {
  if (!isQa) {
    return 'assignee';
  }
  const trimmed = assigneeField?.trim();
  if (trimmed && trimmed !== 'qaEngineer' && trimmed !== 'assignee') {
    return trimmed;
  }
  return 'assignee';
}

function applyDomainAssigneePatch(patch: IssueTrackerIssuePatch): Record<string, unknown> {
  const { assigneeField, assigneeId, isQa, rest } = splitIssueTrackerIssuePatch(patch);
  if (typeof assigneeId !== 'string' || !assigneeId.trim()) {
    return rest;
  }
  return {
    ...rest,
    [jiraAssigneeFieldFromDomainPatch(assigneeField, isQa)]: { id: assigneeId.trim() },
  };
}

function peelJiraAssigneeField(fields: Record<string, unknown>): {
  assignee: unknown;
  fields: Record<string, unknown>;
} {
  if (!Object.hasOwn(fields, 'assignee')) {
    return { assignee: undefined, fields };
  }
  const { assignee, ...rest } = fields;
  return { assignee, fields: rest };
}

function peelJiraParentField(fields: Record<string, unknown>): {
  fields: Record<string, unknown>;
  parent: unknown;
} {
  if (!Object.hasOwn(fields, 'parent')) {
    return { fields, parent: undefined };
  }
  const { parent, ...rest } = fields;
  return { fields: rest, parent };
}

function normalizeJiraIssueUpdateFields(fields: Record<string, unknown>): Record<string, unknown> {
  return normalizeJiraUserShapedFields(fields);
}

async function putJiraIssueFields(
  api: AxiosInstance,
  issueKey: string,
  fields: Record<string, unknown>
): Promise<unknown> {
  const { data } = await api.put(jiraIssuePath(issueKey), { fields });
  return data ?? {};
}

function readTrimmedString(row: Record<string, unknown>, key: string): string {
  const raw = row[key];
  return typeof raw === 'string' ? raw.trim() : '';
}

function parseJiraUserIdentity(
  raw: unknown
): { accountId?: string; email?: string; key?: string; name?: string } | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const name = readTrimmedString(row, 'name');
  const key = readTrimmedString(row, 'key');
  const accountId = readTrimmedString(row, 'accountId');
  const email = readTrimmedString(row, 'emailAddress');
  if (!name && !key && !accountId) {
    return null;
  }
  return {
    ...(accountId ? { accountId } : {}),
    ...(email ? { email } : {}),
    ...(key ? { key } : {}),
    ...(name ? { name } : {}),
  };
}

function pickBestJiraUserIdentity(
  users: Array<{ accountId?: string; email?: string; key?: string; name?: string }>,
  query: string
): { accountId?: string; email?: string; key?: string; name?: string } | null {
  const q = query.trim().toLowerCase();
  return (
    users.find((user) => user.email?.toLowerCase() === q) ??
    users.find((user) => user.name?.toLowerCase() === q) ??
    users[0] ??
    null
  );
}

async function readJiraUser(
  api: AxiosInstance,
  params: Record<string, string>
): Promise<{ accountId?: string; key?: string; name?: string } | null> {
  try {
    const { data } = await api.get<unknown>('/user', { params });
    return parseJiraUserIdentity(data);
  } catch {
    return null;
  }
}

async function searchJiraUserIdentity(
  api: AxiosInstance,
  id: string
): Promise<{ accountId?: string; email?: string; key?: string; name?: string } | null> {
  try {
    const { data } = await api.get<unknown>('/user/search', {
      params: jiraUserSearchRequestParams(id, getIssueTrackerProviderKind(), 5),
    });
    const rows = Array.isArray(data) ? data : [];
    const users = rows
      .map((row) => parseJiraUserIdentity(row))
      .filter((user): user is NonNullable<typeof user> => user != null);
    return pickBestJiraUserIdentity(users, id);
  } catch {
    return null;
  }
}

async function lookupJiraUserIdentity(
  api: AxiosInstance,
  id: string
): Promise<{ accountId?: string; email?: string; key?: string; name?: string } | null> {
  return (
    (await readJiraUser(api, { username: id })) ??
    (await readJiraUser(api, { key: id })) ??
    (await readJiraUser(api, { accountId: id })) ??
    (await searchJiraUserIdentity(api, id))
  );
}

function jiraAssigneePutBodyFromUser(
  fallbackId: string,
  user: { accountId?: string; key?: string; name?: string } | null
): { accountId?: string; name?: string | null } {
  if (user?.accountId) {
    return { accountId: user.accountId };
  }
  if (user?.name) {
    return { name: user.name };
  }
  if (user?.key) {
    return { name: user.key };
  }
  return jiraAssigneePutBody(fallbackId);
}

async function putJiraIssueAssignee(
  api: AxiosInstance,
  issueKey: string,
  value: unknown
): Promise<void> {
  const id = extractJiraUserId(value);
  if (!id) {
    await api.put(`${jiraIssuePath(issueKey)}/assignee`, { name: null });
    return;
  }
  const user = await lookupJiraUserIdentity(api, id);
  await api.put(
    `${jiraIssuePath(issueKey)}/assignee`,
    jiraAssigneePutBodyFromUser(id, user)
  );
}

async function updateJiraStoryPoints(
  api: AxiosInstance,
  issueKey: string,
  value: unknown
): Promise<void> {
  const boardId = await loadEstimationBoardId(api, issueKey);
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (boardId && baseUrl) {
    try {
      await putJiraAgileEstimation(api, issueKey, value, boardId);
      return;
    } catch {
      // Story Points often is not on the issue edit screen — field PUT is the fallback.
    }
  }
  const fieldId = pickJiraStoryPointsFieldId(await fetchJiraFieldCatalog(api));
  if (!fieldId) {
    throw new Error('Jira Story Points field is not available for this issue');
  }
  await putJiraIssueFields(api, issueKey, { [fieldId]: value });
}

async function assignTestPointsField(
  api: AxiosInstance,
  fields: Record<string, unknown>,
  testPoints: unknown
): Promise<void> {
  const fieldId = pickJiraNamedNumberFieldId(await fetchJiraFieldCatalog(api), TEST_POINTS_FIELD_NAMES);
  if (!fieldId) {
    throw new Error('Jira Test Points field is not available for this issue');
  }
  fields[fieldId] = testPoints;
}

export async function updateJiraIssue(
  api: AxiosInstance,
  issueKey: string,
  patch: IssueTrackerIssuePatch
): Promise<unknown> {
  const key = issueKey.trim();
  const { fields, storyPoints, testPoints } = splitJiraIssueUpdatePatch(
    applyDomainAssigneePatch(patch)
  );
  const { assignee, fields: withoutAssignee } = peelJiraAssigneeField(fields);
  const { parent, fields: withoutParent } = peelJiraParentField(withoutAssignee);
  const nextFields = await applyJiraScheduleFields(api, key, { ...withoutParent });
  if (testPoints !== undefined) {
    await assignTestPointsField(api, nextFields, testPoints);
  }
  if (storyPoints !== undefined) {
    await updateJiraStoryPoints(api, key, storyPoints);
  }
  if (assignee !== undefined) {
    await putJiraIssueAssignee(api, key, assignee);
  }
  if (parent !== undefined) {
    await putJiraIssueParent(api, key, parent);
  }
  if (Object.keys(nextFields).length === 0) {
    return {};
  }
  return putJiraIssueFields(api, key, normalizeJiraIssueUpdateFields(nextFields));
}
