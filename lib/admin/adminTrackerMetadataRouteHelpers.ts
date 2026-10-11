import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type {
  TrackerMetadataFieldDto,
  TrackerMetadataStatusDto,
} from '@/lib/trackerIntegration/fetchTrackerOrgMetadata';
import type { AxiosInstance } from 'axios';

import { NextResponse } from 'next/server';

import { apiCache, cacheKeys } from '@/lib/cache';
import { createIssueTrackerAxiosForCredentials } from '@/lib/issueTrackerProvider/createIssueTrackerAxios';
import {
  getOrganizationTrackerCredentials,
  organizationTrackerClientAuth,
  type OrganizationTrackerCredentials,
} from '@/lib/organizations/organizationTrackerCredentials';
import {
  trackerAdminCatalogConnectionFingerprint,
  TRACKER_ADMIN_METADATA_TTL_SEC,
} from '@/lib/trackerApi/trackerAdminCatalogCache';
import {
  fetchTrackerOrganizationFields,
  fetchTrackerOrganizationStatuses,
  fetchTrackerFieldEnumValues,
} from '@/lib/trackerIntegration/fetchTrackerOrgMetadata';

/** Клиент трекера с секретом организации: OAuth-пара Jira Cloud — через шлюз по cloudId. */
export function createAdminTrackerMetadataAxios(input: {
  apiUrl: string;
  cloudId: string;
  credentials: OrganizationTrackerCredentials;
  jiraEmail: string;
  orgId: string;
  providerKind: IssueTrackerProviderKind;
}): AxiosInstance {
  const auth = organizationTrackerClientAuth(input);
  return createIssueTrackerAxiosForCredentials({
    apiUrl: auth.apiUrl,
    jiraEmail: auth.jiraEmail,
    oauthToken: input.credentials.accessToken,
    orgId: input.orgId,
    providerKind: input.providerKind,
  });
}

export function parseTrackerMetadataResource(
  resourceParam: string | null
): NextResponse | string {
  const resource = (resourceParam ?? 'all').toLowerCase();
  if (!['all', 'fields', 'statuses', 'field-values'].includes(resource)) {
    return NextResponse.json(
      { error: 'resource must be fields, statuses, field-values, or all' },
      { status: 400 }
    );
  }
  return resource;
}

export async function resolveTrackerMetadataCredentials(
  orgId: string
): Promise<NextResponse | OrganizationTrackerCredentials> {
  try {
    const credentials = await getOrganizationTrackerCredentials(orgId);
    if (!credentials?.accessToken.trim()) {
      return NextResponse.json(
        {
          error:
            'Нет сохранённого OAuth-токена трекера. Сохраните токен во вкладке «Яндекс Трекер», затем повторите запрос.',
        },
        { status: 422 }
      );
    }
    return { ...credentials, accessToken: credentials.accessToken.trim() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function fetchTrackerMetadataFieldValues(
  api: AxiosInstance,
  kind: IssueTrackerProviderKind,
  fieldIdRaw: string | null
): Promise<NextResponse | { fieldId: string; values: unknown[] }> {
  const fieldId = (fieldIdRaw ?? '').trim();
  if (!fieldId) {
    return NextResponse.json(
      { error: 'fieldId is required for resource=field-values' },
      { status: 400 }
    );
  }
  const values = await fetchTrackerFieldEnumValues(api, kind, fieldId);
  return { fieldId, values };
}

export async function loadCachedTrackerOrgMetadata(args: {
  api: AxiosInstance;
  fingerprint: string;
  kind: IssueTrackerProviderKind;
  orgId: string;
  resource: string;
}): Promise<{ fields: TrackerMetadataFieldDto[]; statuses: TrackerMetadataStatusDto[] }> {
  const wantFields = args.resource === 'all' || args.resource === 'fields';
  const wantStatuses = args.resource === 'all' || args.resource === 'statuses';

  let fields: TrackerMetadataFieldDto[] | null = wantFields
    ? apiCache.get<TrackerMetadataFieldDto[]>(
        cacheKeys.adminTrackerOrgMetadata(args.orgId, args.fingerprint, 'fields')
      )
    : null;
  let statuses: TrackerMetadataStatusDto[] | null = wantStatuses
    ? apiCache.get<TrackerMetadataStatusDto[]>(
        cacheKeys.adminTrackerOrgMetadata(args.orgId, args.fingerprint, 'statuses')
      )
    : null;

  if (wantFields && !fields) {
    fields = await fetchTrackerOrganizationFields(args.api, args.kind);
    apiCache.set(
      cacheKeys.adminTrackerOrgMetadata(args.orgId, args.fingerprint, 'fields'),
      fields,
      TRACKER_ADMIN_METADATA_TTL_SEC
    );
  }
  if (wantStatuses && !statuses) {
    statuses = await fetchTrackerOrganizationStatuses(args.api, args.kind);
    apiCache.set(
      cacheKeys.adminTrackerOrgMetadata(args.orgId, args.fingerprint, 'statuses'),
      statuses,
      TRACKER_ADMIN_METADATA_TTL_SEC
    );
  }

  return { fields: fields ?? [], statuses: statuses ?? [] };
}

export function trackerMetadataFieldsStatusesResponse(
  resource: string,
  fields: TrackerMetadataFieldDto[],
  statuses: TrackerMetadataStatusDto[]
): NextResponse {
  if (resource === 'fields') {
    return NextResponse.json({ fields });
  }
  if (resource === 'statuses') {
    return NextResponse.json({ statuses });
  }
  return NextResponse.json({ fields, statuses });
}

export { trackerAdminCatalogConnectionFingerprint };
