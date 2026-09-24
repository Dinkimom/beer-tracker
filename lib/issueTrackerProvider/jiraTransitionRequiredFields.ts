import type { IssueTrackerTransitionInput } from './types';
import type { AxiosInstance } from 'axios';

import { apiCache } from '@/lib/cache';

const WORKFLOW_REQUIRED_CACHE_TTL_SECONDS = 60 * 60;
const ID_REF_ITEMS = new Set(['component', 'group', 'issuetype', 'option', 'version']);
const TRANSITION_PASSTHROUGH_KEYS = new Set(['comment', 'resolution']);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function workflowRequiredCacheKey(baseUrl: string, projectId: string, issueTypeId: string): string {
  return `jira:workflow-required:${baseUrl}:${projectId}:${issueTypeId}`;
}

export function parseJiraFieldsRequired(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw !== 'string') {
    return [];
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.startsWith('[')) {
    try {
      return parseJiraFieldsRequired(JSON.parse(trimmed) as unknown);
    } catch {
      return [];
    }
  }
  return trimmed
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function jiraValidatorRequiredFieldIds(validators: unknown): string[] {
  if (!Array.isArray(validators)) {
    return [];
  }
  const ids: string[] = [];
  for (const validator of validators) {
    const row = asRecord(validator);
    const parameters = asRecord(row?.parameters);
    if (parameters?.ruleType !== 'fieldRequired') {
      continue;
    }
    ids.push(...parseJiraFieldsRequired(parameters.fieldsRequired));
  }
  return [...new Set(ids)];
}

export function jiraWorkflowRequiredFieldsByTransition(data: unknown): Record<string, string[]> {
  const workflows = asRecord(data)?.workflows;
  if (!Array.isArray(workflows)) {
    return {};
  }
  const out: Record<string, string[]> = {};
  for (const workflow of workflows) {
    const transitions = asRecord(workflow)?.transitions;
    if (!Array.isArray(transitions)) {
      continue;
    }
    collectTransitionRequiredFields(transitions, out);
  }
  return out;
}

function collectTransitionRequiredFields(
  transitions: unknown[],
  out: Record<string, string[]>
): void {
  for (const transition of transitions) {
    const row = asRecord(transition);
    const id = row?.id != null ? String(row.id).trim() : '';
    if (!id) {
      continue;
    }
    const ids = jiraValidatorRequiredFieldIds(row?.validators);
    if (ids.length === 0) {
      continue;
    }
    out[id] = [...new Set([...(out[id] ?? []), ...ids])];
  }
}

export function isEmptyJiraIssueFieldValue(value: unknown): boolean {
  if (value == null) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

function readNestedId(value: unknown): string {
  const id = asRecord(value)?.id;
  return id != null ? String(id).trim() : '';
}

function asIdRef(value: unknown): { id: string } | null {
  if (typeof value === 'string' || typeof value === 'number') {
    const id = String(value).trim();
    return id ? { id } : null;
  }
  const id = readNestedId(value);
  return id ? { id } : null;
}

export function jiraUpdateValueForSchema(schema: unknown, value: unknown): unknown {
  const row = asRecord(schema);
  const type = typeof row?.type === 'string' ? row.type : '';
  const items = typeof row?.items === 'string' ? row.items : '';
  if (type === 'array' && ID_REF_ITEMS.has(items)) {
    const list = Array.isArray(value) ? value : [value];
    return list.map(asIdRef).filter((item): item is { id: string } => item != null);
  }
  if (type === 'component' || type === 'option' || type === 'priority' || type === 'version') {
    return asIdRef(value) ?? value;
  }
  return value;
}

function issueFields(data: unknown): Record<string, unknown> {
  return asRecord(asRecord(data)?.fields) ?? {};
}

function editmetaFields(data: unknown): Record<string, unknown> {
  return asRecord(asRecord(data)?.fields) ?? {};
}

async function readIssueProjectAndType(
  api: AxiosInstance,
  issueKey: string
): Promise<{ issueTypeId: string; projectId: string } | null> {
  const { data } = await api.get<unknown>(`/issue/${encodeURIComponent(issueKey)}`, {
    params: { fields: 'issuetype,project' },
  });
  const fields = issueFields(data);
  const projectId = readNestedId(fields.project);
  const issueTypeId = readNestedId(fields.issuetype);
  if (!projectId || !issueTypeId) {
    return null;
  }
  return { issueTypeId, projectId };
}

async function loadWorkflowRequiredFields(
  api: AxiosInstance,
  projectId: string,
  issueTypeId: string
): Promise<Record<string, string[]>> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  const cacheKey = workflowRequiredCacheKey(baseUrl, projectId, issueTypeId);
  const cached = apiCache.get<Record<string, string[]>>(cacheKey);
  if (cached) {
    return cached;
  }
  const { data } = await api.post<unknown>('/workflows', {
    projectAndIssueTypes: [{ issueTypeId, projectId }],
  });
  const mapped = jiraWorkflowRequiredFieldsByTransition(data);
  apiCache.set(cacheKey, mapped, WORKFLOW_REQUIRED_CACHE_TTL_SECONDS);
  return mapped;
}

export async function fetchJiraValidatorRequiredFieldIds(
  api: AxiosInstance,
  issueKey: string,
  transitionId: string
): Promise<string[]> {
  try {
    const identity = await readIssueProjectAndType(api, issueKey);
    if (!identity) {
      return [];
    }
    const byTransition = await loadWorkflowRequiredFields(
      api,
      identity.projectId,
      identity.issueTypeId
    );
    return byTransition[transitionId] ?? [];
  } catch {
    return [];
  }
}

export async function fetchEmptyJiraIssueFieldIds(
  api: AxiosInstance,
  issueKey: string,
  fieldIds: string[]
): Promise<string[]> {
  if (fieldIds.length === 0) {
    return [];
  }
  const { data } = await api.get<unknown>(`/issue/${encodeURIComponent(issueKey)}`, {
    params: { fields: fieldIds.join(',') },
  });
  const fields = issueFields(data);
  return fieldIds.filter((fieldId) => isEmptyJiraIssueFieldValue(fields[fieldId]));
}

export async function fetchJiraEditmetaFields(
  api: AxiosInstance,
  issueKey: string
): Promise<Record<string, unknown>> {
  const { data } = await api.get<unknown>(`/issue/${encodeURIComponent(issueKey)}/editmeta`);
  return editmetaFields(data);
}

function transitionRows(data: unknown): unknown[] {
  const transitions = asRecord(data)?.transitions;
  return Array.isArray(transitions) ? transitions : [];
}

async function fetchJiraTransitionScreenFieldIds(
  api: AxiosInstance,
  issueKey: string,
  transitionId: string
): Promise<Set<string>> {
  const { data } = await api.get<unknown>(`/issue/${encodeURIComponent(issueKey)}/transitions`, {
    params: { expand: 'transitions.fields' },
  });
  const match = transitionRows(data).find((row) => {
    const id = asRecord(row)?.id;
    return id != null && String(id).trim() === transitionId;
  });
  const fields = asRecord(asRecord(match)?.fields);
  return new Set(fields ? Object.keys(fields) : []);
}

function pendingFieldKeys(input: IssueTrackerTransitionInput): string[] {
  return Object.entries(input)
    .filter(([key, value]) => !TRANSITION_PASSTHROUGH_KEYS.has(key) && !isEmptyJiraIssueFieldValue(value))
    .map(([key]) => key);
}

function withoutKeys(
  input: IssueTrackerTransitionInput,
  keys: ReadonlySet<string>
): IssueTrackerTransitionInput {
  const next: IssueTrackerTransitionInput = {};
  for (const [key, value] of Object.entries(input)) {
    if (!keys.has(key)) {
      next[key] = value;
    }
  }
  return next;
}

async function putOffScreenFields(
  api: AxiosInstance,
  issueKey: string,
  input: IssueTrackerTransitionInput,
  fieldIds: string[]
): Promise<void> {
  const editmeta = await fetchJiraEditmetaFields(api, issueKey);
  const fields: Record<string, unknown> = {};
  for (const fieldId of fieldIds) {
    const schema = asRecord(editmeta[fieldId])?.schema;
    fields[fieldId] = jiraUpdateValueForSchema(schema, input[fieldId]);
  }
  await api.put(`/issue/${encodeURIComponent(issueKey)}`, { fields });
}

/**
 * Jira field-required validators are not transition screen fields (`hasScreen: false`).
 * Write them on the issue first — the transition payload ignores fields that are not on the screen.
 */
export async function applyJiraOffScreenRequiredFields(
  api: AxiosInstance,
  issueKey: string,
  transitionId: string,
  input: IssueTrackerTransitionInput
): Promise<IssueTrackerTransitionInput> {
  const pending = pendingFieldKeys(input);
  if (pending.length === 0) {
    return input;
  }
  const requiredIds = await fetchJiraValidatorRequiredFieldIds(api, issueKey, transitionId);
  const requiredPending = pending.filter((fieldId) => requiredIds.includes(fieldId));
  if (requiredPending.length === 0) {
    return input;
  }
  const screenFieldIds = await fetchJiraTransitionScreenFieldIds(api, issueKey, transitionId);
  const offScreen = requiredPending.filter((fieldId) => !screenFieldIds.has(fieldId));
  if (offScreen.length === 0) {
    return input;
  }
  await putOffScreenFields(api, issueKey, input, offScreen);
  return withoutKeys(input, new Set(offScreen));
}
