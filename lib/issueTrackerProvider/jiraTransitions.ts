import type { IssueTrackerScreenField, IssueTrackerTransitionInput } from './types';
import type { AxiosInstance } from 'axios';

import { mapJiraStatus } from './jiraIssues';
import {
  applyJiraOffScreenRequiredFields,
  fetchEmptyJiraIssueFieldIds,
  fetchJiraEditmetaFields,
  fetchJiraValidatorRequiredFieldIds,
} from './jiraTransitionRequiredFields';

const JIRA_TRANSITIONS_BATCH_CONCURRENCY = 10;

interface JiraTransitionItem {
  display: string;
  id: string;
  to: { display: string; id?: string; key: string; statusTypeKey?: string };
}

interface JiraTransitionRaw {
  fields?: unknown;
  id?: unknown;
  name?: string;
  to?: Parameters<typeof mapJiraStatus>[0];
}

function jiraIssueTransitionsPath(issueKey: string): string {
  return `/issue/${encodeURIComponent(issueKey)}/transitions`;
}

export function extractJiraTransitionRows(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (!data || typeof data !== 'object') {
    return [];
  }
  const transitions = (data as { transitions?: unknown }).transitions;
  return Array.isArray(transitions) ? transitions : [];
}

export function mapJiraTransition(raw: unknown): JiraTransitionItem | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as JiraTransitionRaw;
  const id = row.id != null && String(row.id).trim() !== '' ? String(row.id).trim() : '';
  if (!id) {
    return null;
  }
  const to = mapJiraStatus(row.to);
  return {
    display: row.name?.trim() || to.display,
    id,
    to,
  };
}

function mapJiraTransitionList(data: unknown): JiraTransitionItem[] {
  const out: JiraTransitionItem[] = [];
  for (const row of extractJiraTransitionRows(data)) {
    const mapped = mapJiraTransition(row);
    if (mapped) {
      out.push(mapped);
    }
  }
  return out;
}

function mapJiraAllowedValue(raw: unknown): { label: string; value: string } | null {
  if (typeof raw === 'string' && raw.trim()) {
    const value = raw.trim();
    return { label: value, value };
  }
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as { id?: unknown; name?: string; value?: string };
  const label = row.name?.trim() || row.value?.trim() || (row.id != null ? String(row.id) : '');
  if (!label) {
    return null;
  }
  const value = row.id != null && String(row.id).trim() !== '' ? String(row.id).trim() : label;
  return { label, value };
}

function mapJiraTransitionField(fieldId: string, raw: unknown): IssueTrackerScreenField | null {
  const id = fieldId.trim();
  if (!id || !raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as {
    allowedValues?: unknown;
    name?: string;
    required?: boolean;
    schema?: { items?: string; type?: string };
  };
  const options = Array.isArray(row.allowedValues)
    ? row.allowedValues
        .map(mapJiraAllowedValue)
        .filter((option): option is { label: string; value: string } => option != null)
    : [];
  return {
    display: row.name?.trim() || id,
    id,
    ...(options.length > 0 ? { options } : {}),
    required: Boolean(row.required),
    schemaItems: row.schema?.items,
    schemaType: row.schema?.type,
  };
}

export function mapJiraTransitionFields(fields: unknown): IssueTrackerScreenField[] {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    return [];
  }
  const out: IssueTrackerScreenField[] = [];
  for (const [fieldId, raw] of Object.entries(fields as Record<string, unknown>)) {
    const mapped = mapJiraTransitionField(fieldId, raw);
    if (mapped) {
      out.push(mapped);
    }
  }
  return out;
}

function mapJiraResolutionField(resolution: unknown): unknown {
  if (resolution && typeof resolution === 'object' && !Array.isArray(resolution)) {
    return resolution;
  }
  const value = String(resolution ?? '').trim();
  if (!value) {
    return undefined;
  }
  if (/^\d+$/.test(value)) {
    return { id: value };
  }
  if (value.toLowerCase() === 'fixed') {
    return { name: 'Fixed' };
  }
  return { name: value };
}

export function buildJiraTransitionRequestBody(
  transitionId: string,
  input: IssueTrackerTransitionInput
): Record<string, unknown> {
  const { comment, resolution, ...rest } = input;
  const fields: Record<string, unknown> = { ...rest };
  if (resolution !== undefined && resolution !== null && resolution !== '') {
    const mapped = mapJiraResolutionField(resolution);
    if (mapped !== undefined) {
      fields.resolution = mapped;
    }
  }
  const body: Record<string, unknown> = {
    transition: { id: transitionId },
  };
  if (Object.keys(fields).length > 0) {
    body.fields = fields;
  }
  if (typeof comment === 'string' && comment.trim()) {
    body.update = { comment: [{ add: { body: comment } }] };
  }
  return body;
}

export async function fetchJiraIssueTransitions(
  api: AxiosInstance,
  issueKey: string
): Promise<JiraTransitionItem[]> {
  const key = issueKey.trim();
  if (!key) {
    return [];
  }
  const { data } = await api.get<unknown>(jiraIssueTransitionsPath(key));
  return mapJiraTransitionList(data);
}

export async function fetchJiraIssueTransitionsBatch(
  api: AxiosInstance,
  issueKeys: string[]
): Promise<Record<string, JiraTransitionItem[]>> {
  const uniqueKeys = [...new Set(issueKeys.map((key) => key.trim()).filter(Boolean))];
  const result: Record<string, JiraTransitionItem[]> = {};
  for (let i = 0; i < uniqueKeys.length; i += JIRA_TRANSITIONS_BATCH_CONCURRENCY) {
    const batch = uniqueKeys.slice(i, i + JIRA_TRANSITIONS_BATCH_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async (key) => ({ key, list: await fetchJiraIssueTransitions(api, key) }))
    );
    for (const item of settled) {
      if (item.status === 'fulfilled') {
        result[item.value.key] = item.value.list;
      }
    }
  }
  return result;
}

/**
 * Yandex Tracker lists transition screens per queue. Jira screen fields come from
 * `GET /issue/{key}/transitions?expand=transitions.fields`. Field-required workflow
 * validators are not on that screen; fetchJiraTransitionFields merges them so the
 * planner can open the transition modal. Queue prefetch stays empty.
 */
export function fetchJiraQueueWorkflowScreens(): Promise<
  Record<string, Record<string, IssueTrackerScreenField[]>>
> {
  return Promise.resolve({});
}

export async function fetchJiraTransitionFields(
  api: AxiosInstance,
  issueKey: string,
  transitionId: string
): Promise<IssueTrackerScreenField[]> {
  const key = issueKey.trim();
  const id = String(transitionId).trim();
  if (!key || !id) {
    return [];
  }
  const { data } = await api.get<unknown>(jiraIssueTransitionsPath(key), {
    params: { expand: 'transitions.fields' },
  });
  const match = extractJiraTransitionRows(data).find((row) => {
    if (!row || typeof row !== 'object') {
      return false;
    }
    return String((row as JiraTransitionRaw).id ?? '').trim() === id;
  });
  if (!match || typeof match !== 'object') {
    return [];
  }
  const screenFields = mapJiraTransitionFields((match as JiraTransitionRaw).fields);
  return appendOffScreenRequiredFields(api, key, id, screenFields);
}

async function appendOffScreenRequiredFields(
  api: AxiosInstance,
  issueKey: string,
  transitionId: string,
  screenFields: IssueTrackerScreenField[]
): Promise<IssueTrackerScreenField[]> {
  const requiredIds = await fetchJiraValidatorRequiredFieldIds(api, issueKey, transitionId);
  const screenIds = new Set(screenFields.map((field) => field.id));
  const withRequiredFlag = screenFields.map((field) =>
    requiredIds.includes(field.id) ? { ...field, required: true } : field
  );
  const missingIds = requiredIds.filter((fieldId) => !screenIds.has(fieldId));
  if (missingIds.length === 0) {
    return withRequiredFlag;
  }
  try {
    return await appendEmptyRequiredEditmetaFields(api, issueKey, withRequiredFlag, missingIds);
  } catch {
    return withRequiredFlag;
  }
}

async function appendEmptyRequiredEditmetaFields(
  api: AxiosInstance,
  issueKey: string,
  screenFields: IssueTrackerScreenField[],
  missingIds: string[]
): Promise<IssueTrackerScreenField[]> {
  const emptyIds = await fetchEmptyJiraIssueFieldIds(api, issueKey, missingIds);
  if (emptyIds.length === 0) {
    return screenFields;
  }
  const editmeta = await fetchJiraEditmetaFields(api, issueKey);
  const extra = emptyIds.flatMap((fieldId) => {
    const mapped = mapJiraTransitionField(fieldId, editmeta[fieldId]);
    return mapped ? [{ ...mapped, required: true }] : [];
  });
  return [...screenFields, ...extra];
}

export async function transitionJiraIssue(
  api: AxiosInstance,
  issueKey: string,
  transitionId: string,
  input: IssueTrackerTransitionInput
): Promise<void> {
  const key = issueKey.trim();
  const id = String(transitionId).trim();
  if (!key || !id) {
    throw new Error('Jira transition requires an issue key and transition id');
  }
  const transitionInput = await applyJiraOffScreenRequiredFields(api, key, id, input);
  await api.post(jiraIssueTransitionsPath(key), buildJiraTransitionRequestBody(id, transitionInput));
}
