import type { AxiosInstance } from 'axios';

import { extractTrackerMetadataArray } from '@/lib/trackerIntegration/fetchTrackerOrgMetadataHelpers';

import {
  jiraAgileEpicIssuesUrl,
  jiraAgileEpicNoneIssuesUrl,
  jiraAgileIssueUrl,
} from './jiraCatalog';

const EPIC_LINK_SCHEMA = 'gh-epic-link';

interface JiraFieldCatalogRow {
  id?: string;
  key?: string;
  name?: string;
  schema?: { custom?: string };
}

function jiraIssuePath(issueKey: string): string {
  return `/issue/${encodeURIComponent(issueKey)}`;
}

function readTrimmedKey(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const key = value.trim();
  return key ? key : null;
}

export function jiraParentKeyFromValue(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string') {
    return readTrimmedKey(value);
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  return readTrimmedKey(row.key) ?? readTrimmedKey(row.id);
}

export function jiraParentPutBody(value: unknown): { key: string } | null {
  const key = jiraParentKeyFromValue(value);
  return key ? { key } : null;
}

function issueKeyFromRef(raw: unknown): string | null {
  if (typeof raw === 'string') {
    return readTrimmedKey(raw);
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const row = raw as { key?: unknown; name?: unknown };
  return readTrimmedKey(row.key) ?? readTrimmedKey(row.name);
}

function parentAndEpicFromPayload(data: unknown): { epicKey: string | null; parentKey: string | null } {
  if (!data || typeof data !== 'object') {
    return { epicKey: null, parentKey: null };
  }
  const fields = (data as { fields?: unknown }).fields;
  const row = (
    fields && typeof fields === 'object' ? fields : data
  ) as Record<string, unknown>;
  return {
    epicKey: issueKeyFromRef(row.epic),
    parentKey: issueKeyFromRef(row.parent),
  };
}

function sameJiraIssueKey(left: string | null, right: string): boolean {
  return left != null && left.localeCompare(right, undefined, { sensitivity: 'accent' }) === 0;
}

function fieldCatalogId(row: JiraFieldCatalogRow): string | null {
  const id = row.id?.trim() || row.key?.trim();
  return id || null;
}

export function pickJiraEpicLinkFieldId(fields: unknown[]): string | null {
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
    if ((row.schema?.custom ?? '').includes(EPIC_LINK_SCHEMA)) {
      return id;
    }
    const name = (row.name ?? '').trim().toLowerCase();
    if (!byName && name === 'epic link') {
      byName = id;
    }
  }
  return byName;
}

async function readParentAndEpic(
  api: AxiosInstance,
  url: string,
  config?: { params?: Record<string, string> }
): Promise<{ epicKey: string | null; parentKey: string | null }> {
  try {
    const { data } = config ? await api.get<unknown>(url, config) : await api.get<unknown>(url);
    return parentAndEpicFromPayload(data);
  } catch {
    return { epicKey: null, parentKey: null };
  }
}

async function jiraIssueHasParentOrEpic(
  api: AxiosInstance,
  issueKey: string,
  parentKey: string
): Promise<boolean> {
  const rest = await readParentAndEpic(api, jiraIssuePath(issueKey), {
    params: { fields: 'parent' },
  });
  if (sameJiraIssueKey(rest.parentKey, parentKey)) {
    return true;
  }
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl) {
    return false;
  }
  try {
    const { data } = await api.get<unknown>(jiraAgileIssueUrl(baseUrl, issueKey));
    const agile = parentAndEpicFromPayload(data);
    return (
      sameJiraIssueKey(agile.parentKey, parentKey) || sameJiraIssueKey(agile.epicKey, parentKey)
    );
  } catch {
    return false;
  }
}

async function putJiraParentField(
  api: AxiosInstance,
  issueKey: string,
  parent: { key: string } | null
): Promise<void> {
  await api.put(jiraIssuePath(issueKey), { fields: { parent } });
}

async function addJiraIssueToEpic(
  api: AxiosInstance,
  issueKey: string,
  epicKey: string
): Promise<boolean> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl) {
    return false;
  }
  try {
    await api.post(jiraAgileEpicIssuesUrl(baseUrl, epicKey), { issues: [issueKey] });
    return true;
  } catch {
    return false;
  }
}

async function removeJiraIssueFromEpic(api: AxiosInstance, issueKey: string): Promise<void> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl) {
    return;
  }
  try {
    await api.post(jiraAgileEpicNoneIssuesUrl(baseUrl), { issues: [issueKey] });
  } catch {
    // Classic boards without an epic still 404 here.
  }
}

async function putJiraEpicLinkField(
  api: AxiosInstance,
  issueKey: string,
  epicKey: string | null
): Promise<boolean> {
  try {
    const { data } = await api.get<unknown>('/field');
    const fieldId = pickJiraEpicLinkFieldId(extractTrackerMetadataArray(data));
    if (!fieldId) {
      return false;
    }
    await api.put(jiraIssuePath(issueKey), { fields: { [fieldId]: epicKey } });
    return true;
  } catch {
    return false;
  }
}

async function assignJiraIssueParent(
  api: AxiosInstance,
  issueKey: string,
  parentKey: string
): Promise<boolean> {
  try {
    await putJiraParentField(api, issueKey, { key: parentKey });
  } catch {
    // Parent is often missing from the edit screen for a regular Task.
  }
  if (await jiraIssueHasParentOrEpic(api, issueKey, parentKey)) {
    return true;
  }
  if (
    (await putJiraEpicLinkField(api, issueKey, parentKey)) &&
    (await jiraIssueHasParentOrEpic(api, issueKey, parentKey))
  ) {
    return true;
  }
  await addJiraIssueToEpic(api, issueKey, parentKey);
  return jiraIssueHasParentOrEpic(api, issueKey, parentKey);
}

async function clearJiraIssueParent(api: AxiosInstance, issueKey: string): Promise<void> {
  try {
    await putJiraParentField(api, issueKey, null);
  } catch {
    // Not a sub-task — parent cannot be cleared via REST.
  }
  await putJiraEpicLinkField(api, issueKey, null);
  await removeJiraIssueFromEpic(api, issueKey);
}

export async function putJiraIssueParent(
  api: AxiosInstance,
  issueKey: string,
  value: unknown
): Promise<void> {
  const key = issueKey.trim();
  const parentKey = jiraParentKeyFromValue(value);
  if (!parentKey) {
    await clearJiraIssueParent(api, key);
    return;
  }
  const assigned = await assignJiraIssueParent(api, key, parentKey);
  if (!assigned) {
    throw new Error(`Jira did not accept parent ${parentKey} for ${key}`);
  }
}
