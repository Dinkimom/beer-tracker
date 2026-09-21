import type { TrackerConfigShape } from '@/lib/api/admin/types';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

import { adminOrgApiPath } from './paths';

interface AdminTrackerFormState {
  hasStoredToken?: boolean;
  organizationId?: string;
  trackerOrgId?: string;
}

export async function fetchAdminTrackerForm(orgId: string): Promise<AdminTrackerFormState> {
  const { data } = await getPlannerBeerTrackerApi().get<AdminTrackerFormState>(
    adminOrgApiPath(orgId, 'tracker')
  );
  return data;
}

export async function verifyAdminTrackerToken(
  orgId: string,
  body: { oauthToken?: string; trackerOrgId?: string }
): Promise<{ message?: string; ok?: boolean }> {
  const { data } = await getPlannerBeerTrackerApi().post<{ message?: string; ok?: boolean }>(
    adminOrgApiPath(orgId, 'tracker/verify'),
    body
  );
  return data;
}

export async function connectAdminTracker(
  orgId: string,
  body: Record<string, unknown>
): Promise<{
  success?: boolean;
  syncJobEnqueued?: boolean;
  syncJobWarning?: string;
  unchanged?: boolean;
}> {
  const { data } = await getPlannerBeerTrackerApi().post(
    adminOrgApiPath(orgId, 'tracker'),
    body
  );
  return data;
}

export async function fetchAdminTrackerIntegration(
  orgId: string
): Promise<{ config?: TrackerConfigShape }> {
  const { data } = await getPlannerBeerTrackerApi().get<{ config?: TrackerConfigShape }>(
    adminOrgApiPath(orgId, 'tracker-integration')
  );
  return data;
}

export async function saveAdminTrackerIntegration(
  orgId: string,
  draftConfig: TrackerConfigShape
): Promise<{ config?: { configRevision?: number } }> {
  const { data } = await getPlannerBeerTrackerApi().put<{ config?: { configRevision?: number } }>(
    adminOrgApiPath(orgId, 'tracker-integration'),
    draftConfig
  );
  return data;
}

interface TrackerMetadataFieldRow {
  display?: string;
  id: string;
  key?: string;
  name?: string;
  options?: string[];
  schemaType?: string;
}

export async function fetchAdminTrackerMetadataAll(orgId: string): Promise<{
  fields?: TrackerMetadataFieldRow[];
  statuses?: unknown[];
}> {
  const { data } = await getPlannerBeerTrackerApi().get<{
    fields?: TrackerMetadataFieldRow[];
    statuses?: unknown[];
  }>(adminOrgApiPath(orgId, 'tracker-metadata'), { params: { resource: 'all' } });
  return data;
}

export async function fetchAdminTrackerPlatformFieldValues(
  orgId: string,
  fieldId: string
): Promise<string[]> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<{ values?: string[] }>(
      adminOrgApiPath(orgId, 'tracker-metadata'),
      { params: { fieldId, resource: 'field-values' } }
    );
    return Array.isArray(data.values) ? data.values : [];
  } catch {
    return [];
  }
}

interface AdminOrgUserSearchItem {
  avatarUrl?: string | null;
  displayName: string;
  email?: string | null;
  trackerId: string;
}

export async function searchAdminOrgUsers(
  orgId: string,
  query: string,
  signal?: AbortSignal
): Promise<AdminOrgUserSearchItem[]> {
  const { data } = await getPlannerBeerTrackerApi().get<{
    items?: AdminOrgUserSearchItem[];
  }>(adminOrgApiPath(orgId, 'users/search'), {
    params: { q: query },
    signal,
  });
  return data.items ?? [];
}
