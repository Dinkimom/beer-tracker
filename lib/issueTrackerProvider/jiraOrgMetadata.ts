import type { AxiosInstance } from 'axios';

import {
  extractTrackerMetadataArray,
  type TrackerMetadataFieldDto,
  type TrackerMetadataStatusDto,
} from '@/lib/trackerIntegration/fetchTrackerOrgMetadataHelpers';

import { jiraNameKey } from './jiraStatusKeys';

interface JiraFieldRaw {
  clauseNames?: string[];
  custom?: boolean;
  id?: string;
  key?: string;
  name?: string;
  schema?: { custom?: string; type?: string };
}

interface JiraStatusCategoryRaw {
  id?: number;
  key?: string;
  name?: string;
}

interface JiraStatusRaw {
  description?: string;
  id?: string;
  name?: string;
  statusCategory?: JiraStatusCategoryRaw;
}

export function mapJiraFieldToMetadata(raw: unknown): TrackerMetadataFieldDto | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as JiraFieldRaw;
  const id = row.id?.trim() || row.key?.trim();
  if (!id) {
    return null;
  }
  const name = row.name?.trim() || id;
  return {
    display: name,
    id,
    key: row.key?.trim() || id,
    name,
    schemaType: row.schema?.type,
  };
}

export function mapJiraStatusToMetadata(raw: unknown): TrackerMetadataStatusDto | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as JiraStatusRaw;
  const id = row.id?.trim();
  if (!id) {
    return null;
  }
  const display = row.name?.trim() || id;
  // Same key as mapJiraStatus / issues so admin visualToken overrides match planner cards.
  const key = row.name?.trim() ? jiraNameKey(row.name) : id;
  const category = row.statusCategory;
  return {
    description: row.description?.trim() || undefined,
    display,
    id,
    key,
    statusType: category
      ? {
          display: category.name,
          id: category.id != null ? String(category.id) : undefined,
          key: category.key,
        }
      : undefined,
  };
}

export async function fetchJiraOrganizationFields(
  api: AxiosInstance
): Promise<TrackerMetadataFieldDto[]> {
  const { data } = await api.get<unknown>('/field');
  const out: TrackerMetadataFieldDto[] = [];
  for (const row of extractTrackerMetadataArray(data)) {
    const mapped = mapJiraFieldToMetadata(row);
    if (mapped) {
      out.push(mapped);
    }
  }
  return out;
}

export async function fetchJiraOrganizationStatuses(
  api: AxiosInstance
): Promise<TrackerMetadataStatusDto[]> {
  try {
    const { data } = await api.get<unknown>('/status');
    const out: TrackerMetadataStatusDto[] = [];
    for (const row of extractTrackerMetadataArray(data)) {
      const mapped = mapJiraStatusToMetadata(row);
      if (mapped) {
        out.push(mapped);
      }
    }
    return out;
  } catch {
    return [];
  }
}

const JIRA_FIELD_OPTION_PAGE_SIZE = 100;
const JIRA_FIELD_OPTION_MAX_PAGES = 30;

function readJiraOptionLabel(item: unknown): string {
  if (typeof item === 'string') {
    return item.trim();
  }
  if (!item || typeof item !== 'object') {
    return '';
  }
  const row = item as { name?: unknown; value?: unknown };
  if (typeof row.value === 'string' && row.value.trim()) {
    return row.value.trim();
  }
  if (typeof row.name === 'string') {
    return row.name.trim();
  }
  return '';
}

export function readJiraOptionLabels(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item) => readJiraOptionLabel(item)).filter(Boolean);
}

function dedupeJiraOptionLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of labels) {
    if (seen.has(label)) {
      continue;
    }
    seen.add(label);
    out.push(label);
  }
  return out;
}

function readJiraContextIds(data: unknown): string[] {
  return extractTrackerMetadataArray(data)
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return '';
      }
      const id = (row as { id?: unknown }).id;
      if (typeof id === 'string' || typeof id === 'number') {
        return String(id).trim();
      }
      return '';
    })
    .filter(Boolean);
}

function jiraOptionPageIsComplete(data: unknown, count: number): boolean {
  if (data && typeof data === 'object' && (data as { isLast?: unknown }).isLast === true) {
    return true;
  }
  return count < JIRA_FIELD_OPTION_PAGE_SIZE;
}

async function fetchJiraContextOptionLabels(
  api: AxiosInstance,
  fieldId: string,
  contextId: string
): Promise<string[]> {
  const labels: string[] = [];
  let startAt = 0;
  for (let page = 0; page < JIRA_FIELD_OPTION_MAX_PAGES; page += 1) {
    const { data } = await api.get<unknown>(
      `/field/${encodeURIComponent(fieldId)}/context/${encodeURIComponent(contextId)}/option`,
      { params: { maxResults: JIRA_FIELD_OPTION_PAGE_SIZE, startAt } }
    );
    const pageValues =
      data && typeof data === 'object' ? (data as { values?: unknown }).values : undefined;
    const pageLabels = readJiraOptionLabels(pageValues);
    labels.push(...pageLabels);
    if (jiraOptionPageIsComplete(data, pageLabels.length)) {
      break;
    }
    startAt += pageLabels.length;
  }
  return labels;
}

async function fetchJiraCustomFieldOptionLabels(
  api: AxiosInstance,
  fieldId: string
): Promise<string[]> {
  const { data } = await api.get<unknown>(`/field/${encodeURIComponent(fieldId)}/context`);
  const labels: string[] = [];
  for (const contextId of readJiraContextIds(data)) {
    labels.push(...(await fetchJiraContextOptionLabels(api, fieldId, contextId)));
  }
  return dedupeJiraOptionLabels(labels);
}

const JIRA_COMPONENT_FETCH_CONCURRENCY = 8;

function readJiraProjectKeys(data: unknown): string[] {
  return extractTrackerMetadataArray(data)
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return '';
      }
      const key = (row as { key?: unknown }).key;
      return typeof key === 'string' ? key.trim() : '';
    })
    .filter(Boolean);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapItem: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let offset = 0; offset < items.length; offset += concurrency) {
    const chunk = items.slice(offset, offset + concurrency);
    results.push(...(await Promise.all(chunk.map(mapItem))));
  }
  return results;
}

async function fetchJiraProjectComponentNames(
  api: AxiosInstance,
  projectKey: string
): Promise<string[]> {
  try {
    const { data } = await api.get<unknown>(
      `/project/${encodeURIComponent(projectKey)}/components`
    );
    return readJiraOptionLabels(extractTrackerMetadataArray(data));
  } catch {
    return [];
  }
}

async function fetchJiraComponentOptionLabels(api: AxiosInstance): Promise<string[]> {
  const { data } = await api.get<unknown>('/project');
  const names = await mapWithConcurrency(
    readJiraProjectKeys(data),
    JIRA_COMPONENT_FETCH_CONCURRENCY,
    (projectKey) => fetchJiraProjectComponentNames(api, projectKey)
  );
  return dedupeJiraOptionLabels(names.flat()).sort((left, right) => left.localeCompare(right));
}

async function fetchJiraFieldAllowedValues(api: AxiosInstance, fieldId: string): Promise<string[]> {
  const { data } = await api.get<unknown>(`/field/${encodeURIComponent(fieldId)}`);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return [];
  }
  return readJiraOptionLabels((data as { allowedValues?: unknown }).allowedValues);
}

export async function fetchJiraFieldEnumValues(
  api: AxiosInstance,
  fieldId: string
): Promise<string[]> {
  const id = fieldId.trim();
  if (!id) {
    return [];
  }
  if (id === 'components') {
    try {
      return await fetchJiraComponentOptionLabels(api);
    } catch {
      return [];
    }
  }
  try {
    const fromContext = await fetchJiraCustomFieldOptionLabels(api, id);
    if (fromContext.length > 0) {
      return fromContext;
    }
  } catch {
    // Context options exist only for select custom fields.
  }
  try {
    return await fetchJiraFieldAllowedValues(api, id);
  } catch {
    return [];
  }
}
