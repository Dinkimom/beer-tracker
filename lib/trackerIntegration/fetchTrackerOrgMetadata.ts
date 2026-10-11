/**
 * Метаданные трекера для админки (поля, статусы) — сервер, org-токен.
 */

import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type { AxiosInstance } from 'axios';

import {
  fetchJiraFieldEnumValues,
  fetchJiraOrganizationFields,
  fetchJiraOrganizationStatuses,
} from '@/lib/issueTrackerProvider/jiraOrgMetadata';
import { isJiraProviderKind } from '@/lib/issueTrackerProvider/types';
import { TRACKER_V3_BASE } from '@/lib/trackerApi/constants';

import {
  extractTrackerMetadataArray,
  mapTrackerMetadataField,
  mapTrackerMetadataStatus,
  readTrackerFieldEnumValuesFromPayload,
  type TrackerMetadataFieldDto,
  type TrackerMetadataStatusDto,
} from './fetchTrackerOrgMetadataHelpers';

export type { TrackerMetadataFieldDto, TrackerMetadataStatusDto };

/**
 * GET /v3/fields — глобальные поля организации.
 */
export async function fetchTrackerOrganizationFields(
  api: AxiosInstance,
  kind: IssueTrackerProviderKind
): Promise<TrackerMetadataFieldDto[]> {
  if (isJiraProviderKind(kind)) {
    return fetchJiraOrganizationFields(api);
  }
  const { data } = await api.get<unknown>(`${TRACKER_V3_BASE}/fields`);
  const rows = extractTrackerMetadataArray(data);
  const out: TrackerMetadataFieldDto[] = [];
  for (const row of rows) {
    const f = mapTrackerMetadataField(row);
    if (f) {
      out.push(f);
    }
  }
  return out;
}

/**
 * GET /v3/statuses — список статусов (если метод доступен для организации).
 */
export async function fetchTrackerOrganizationStatuses(
  api: AxiosInstance,
  kind: IssueTrackerProviderKind
): Promise<TrackerMetadataStatusDto[]> {
  if (isJiraProviderKind(kind)) {
    return fetchJiraOrganizationStatuses(api);
  }
  try {
    const { data } = await api.get<unknown>(`${TRACKER_V3_BASE}/statuses`, {
      params: { perPage: 1000 },
    });
    const rows = extractTrackerMetadataArray(data);
    const out: TrackerMetadataStatusDto[] = [];
    for (const row of rows) {
      const s = mapTrackerMetadataStatus(row);
      if (s) {
        out.push(s);
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchTrackerFieldEnumValues(
  api: AxiosInstance,
  kind: IssueTrackerProviderKind,
  fieldId: string
): Promise<string[]> {
  if (isJiraProviderKind(kind)) {
    return fetchJiraFieldEnumValues(api, fieldId);
  }
  const id = fieldId.trim();
  if (!id) {
    return [];
  }
  try {
    const { data } = await api.get<unknown>(`${TRACKER_V3_BASE}/fields/${encodeURIComponent(id)}`);
    return readTrackerFieldEnumValuesFromPayload(data);
  } catch {
    return [];
  }
}
