import type { AxiosInstance } from 'axios';

import {
  extractTrackerMetadataArray,
  type TrackerMetadataFieldDto,
  type TrackerMetadataStatusDto,
} from '@/lib/trackerIntegration/fetchTrackerOrgMetadataHelpers';

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
  const category = row.statusCategory;
  return {
    description: row.description?.trim() || undefined,
    display,
    id,
    key: id,
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

export async function fetchJiraFieldEnumValues(
  api: AxiosInstance,
  fieldId: string
): Promise<string[]> {
  const id = fieldId.trim();
  if (!id) {
    return [];
  }
  try {
    const { data } = await api.get<unknown>(`/field/${encodeURIComponent(id)}`);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return [];
    }
    const allowed = (data as { allowedValues?: unknown }).allowedValues;
    if (!Array.isArray(allowed)) {
      return [];
    }
    return allowed
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }
        if (item && typeof item === 'object') {
          const row = item as { name?: string; value?: string };
          return (row.value ?? row.name ?? '').trim();
        }
        return '';
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}
