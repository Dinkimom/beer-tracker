import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type { OrganizationTrackerCredentials } from '@/lib/organizations/organizationTrackerCredentials';
import type { OrganizationRow } from '@/lib/organizations/types';
import type { PlannerTrackerField } from '@/lib/tracker/plannerTrackerFieldOptions';
import type { TrackerMetadataFieldDto } from '@/lib/trackerIntegration/fetchTrackerOrgMetadata';
import type { AxiosInstance } from 'axios';

import {
  createAdminTrackerMetadataAxios,
  loadCachedTrackerOrgMetadata,
} from '@/lib/admin/adminTrackerMetadataRouteHelpers';
import { apiCache, cacheKeys } from '@/lib/cache';
import {
  readIssueTrackerBasicAuthEmail,
  readIssueTrackerCloudId,
} from '@/lib/issueTrackerProvider/settings';
import { getOrganizationTrackerCredentials } from '@/lib/organizations/organizationTrackerCredentials';
import {
  TRACKER_ADMIN_CATALOG_TTL_SEC,
  trackerAdminCatalogConnectionFingerprint,
} from '@/lib/trackerApi/trackerAdminCatalogCache';
import { fetchTrackerFieldEnumValues } from '@/lib/trackerIntegration/fetchTrackerOrgMetadata';
import {
  requireOrganizationIssueTrackerConfig,
  TrackerApiConfigError,
} from '@/lib/trackerRequestConfig';

interface CatalogFailure {
  error: string;
  status: number;
}

type OrganizationTrackerFieldCatalogResult = CatalogFailure | { fields: PlannerTrackerField[] };
type OrganizationTrackerFieldOptionsResult = CatalogFailure | { values: string[] };

interface TrackerSession {
  api: AxiosInstance;
  fingerprint: string;
  kind: IssueTrackerProviderKind;
}

const FIELD_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/;
const MAX_FIELD_OPTIONS = 40;
const MISSING_ORG = 'Сначала укажите организацию трекера в админке.';
const MISSING_TOKEN =
  'Нет сохранённого токена трекера. Сохраните токен в админке и повторите запрос.';
const BAD_FIELD_ID = 'Некорректный идентификатор поля';

function copyOptions(options: string[] | undefined): string[] | undefined {
  if (!options || options.length === 0) {
    return undefined;
  }
  return options.slice(0, MAX_FIELD_OPTIONS);
}

function toPlannerField(field: TrackerMetadataFieldDto): PlannerTrackerField {
  const options = copyOptions(field.options);
  return {
    id: field.id,
    ...(field.display ? { display: field.display } : {}),
    ...(field.key ? { key: field.key } : {}),
    ...(field.name ? { name: field.name } : {}),
    ...(options ? { options } : {}),
    ...(field.schemaCustom ? { schemaCustom: field.schemaCustom } : {}),
    ...(field.schemaType ? { schemaType: field.schemaType } : {}),
  };
}

function readTracker(org: OrganizationRow): CatalogFailure | ReturnType<typeof requireOrganizationIssueTrackerConfig> {
  try {
    return requireOrganizationIssueTrackerConfig(org);
  } catch (error) {
    if (error instanceof TrackerApiConfigError) {
      return { error: error.message, status: error.status };
    }
    throw error;
  }
}

async function readCredentials(orgId: string): Promise<CatalogFailure | OrganizationTrackerCredentials> {
  try {
    const credentials = await getOrganizationTrackerCredentials(orgId);
    const accessToken = credentials?.accessToken.trim() ?? '';
    if (!credentials || !accessToken) {
      return { error: MISSING_TOKEN, status: 422 };
    }
    return { ...credentials, accessToken };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tracker credentials failed';
    return { error: message, status: 500 };
  }
}

async function openTrackerSession(org: OrganizationRow): Promise<CatalogFailure | TrackerSession> {
  const trackerOrgId = org.tracker_org_id.trim();
  if (!trackerOrgId) {
    return { error: MISSING_ORG, status: 422 };
  }
  const tracker = readTracker(org);
  if ('error' in tracker) {
    return tracker;
  }
  const credentials = await readCredentials(org.id);
  if ('error' in credentials) {
    return credentials;
  }
  return {
    api: createAdminTrackerMetadataAxios({
      apiUrl: tracker.apiUrl,
      cloudId: readIssueTrackerCloudId(org.settings),
      credentials,
      jiraEmail: readIssueTrackerBasicAuthEmail(org.settings),
      orgId: trackerOrgId,
      providerKind: tracker.kind,
    }),
    fingerprint: trackerAdminCatalogConnectionFingerprint(
      credentials.accessToken,
      tracker.apiUrl,
      trackerOrgId
    ),
    kind: tracker.kind,
  };
}

function limitOptionValues(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const text = value.trim();
    if (!text || out.includes(text)) {
      continue;
    }
    out.push(text);
    if (out.length >= MAX_FIELD_OPTIONS) {
      break;
    }
  }
  return out;
}

/** Тот же каталог полей, что селект в админке, для пользователей планера. */
export async function loadOrganizationTrackerFieldCatalog(
  org: OrganizationRow
): Promise<OrganizationTrackerFieldCatalogResult> {
  const session = await openTrackerSession(org);
  if ('error' in session) {
    return session;
  }
  const loaded = await loadCachedTrackerOrgMetadata({
    api: session.api,
    fingerprint: session.fingerprint,
    kind: session.kind,
    orgId: org.id,
    resource: 'fields',
  });
  const fields: PlannerTrackerField[] = [];
  for (const field of loaded.fields) {
    fields.push(toPlannerField(field));
  }
  return { fields };
}

/** Фиксированные значения поля-списка. Пустой список — у поля нет вариантов. */
export async function loadOrganizationTrackerFieldOptions(
  org: OrganizationRow,
  fieldIdRaw: string
): Promise<OrganizationTrackerFieldOptionsResult> {
  const fieldId = fieldIdRaw.trim();
  if (!FIELD_ID_PATTERN.test(fieldId)) {
    return { error: BAD_FIELD_ID, status: 400 };
  }
  const session = await openTrackerSession(org);
  if ('error' in session) {
    return session;
  }
  const cacheKey = cacheKeys.adminTrackerFieldValues(org.id, session.fingerprint, fieldId);
  const cached = apiCache.get<string[]>(cacheKey);
  if (cached) {
    return { values: cached };
  }
  const values = limitOptionValues(
    await fetchTrackerFieldEnumValues(session.api, session.kind, fieldId)
  );
  apiCache.set(cacheKey, values, TRACKER_ADMIN_CATALOG_TTL_SEC);
  return { values };
}
