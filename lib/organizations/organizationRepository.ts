/**
 * Чтение/обновление организаций (всегда по id tenant).
 */

import type { OrganizationRow } from './types';
import type { UserOrganizationSummary } from './types';
import type { QueryParams } from '@/types';

import { query } from '@/lib/db';

export async function findOrganizationById(
  organizationId: string
): Promise<OrganizationRow | null> {
  const res = await query<OrganizationRow>(
    `SELECT id, name, slug, tracker_org_id, settings,
            sync_next_run_at, initial_sync_completed_at, created_at, updated_at
     FROM organizations
     WHERE id = $1`,
    [organizationId]
  );
  return res.rows[0] ?? null;
}

/**
 * Организации, готовые к инкрементальному sync по cron: первичная синхронизация завершена,
 * sync не выключен в settings, sync_next_run_at в прошлом или не задан.
 */
export async function listOrganizationsDueForIncrementalSync(
  limit: number
): Promise<OrganizationRow[]> {
  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error('listOrganizationsDueForIncrementalSync: limit must be a positive integer');
  }
  const res = await query<OrganizationRow>(
    `SELECT id, name, slug, tracker_org_id, settings,
            sync_next_run_at, initial_sync_completed_at, created_at, updated_at
     FROM organizations
     WHERE initial_sync_completed_at IS NOT NULL
       AND (sync_next_run_at IS NULL OR sync_next_run_at <= CURRENT_TIMESTAMP)
       AND (settings->'sync'->>'enabled') IS DISTINCT FROM 'false'
     ORDER BY sync_next_run_at NULLS FIRST, id ASC
     LIMIT $1`,
    [limit]
  );
  return res.rows;
}

export async function findOrganizationBySlug(
  slug: string
): Promise<OrganizationRow | null> {
  const res = await query<OrganizationRow>(
    `SELECT id, name, slug, tracker_org_id, settings,
            sync_next_run_at, initial_sync_completed_at, created_at, updated_at
     FROM organizations
     WHERE slug = $1`,
    [slug]
  );
  return res.rows[0] ?? null;
}

export async function fetchFirstOrganizationId(): Promise<string | null> {
  const res = await query<{ id: string }>(
    `SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1`
  );
  return res.rows[0]?.id ?? null;
}

interface UpdateOrganizationPatch {
  initial_sync_completed_at?: Date | null;
  name?: string;
  settings?: Record<string, unknown>;
  slug?: string | null;
  sync_next_run_at?: Date | null;
  tracker_org_id?: string;
}

const ORG_UPDATE_COLUMNS: (keyof UpdateOrganizationPatch)[] = [
  'name',
  'slug',
  'tracker_org_id',
  'settings',
  'sync_next_run_at',
  'initial_sync_completed_at',
];

/**
 * Частичное обновление строки организации. Не трогает не переданные колонки.
 */
export async function updateOrganization(
  organizationId: string,
  patch: UpdateOrganizationPatch
): Promise<OrganizationRow | null> {
  const assignments: string[] = [];
  const values: QueryParams = [organizationId];
  let i = 2;
  for (const col of ORG_UPDATE_COLUMNS) {
    if (patch[col] === undefined) {
      continue;
    }
    assignments.push(`${col} = $${i}`);
    values.push(patch[col] as QueryParams[number]);
    i += 1;
  }
  if (assignments.length === 0) {
    return findOrganizationById(organizationId);
  }
  const res = await query<OrganizationRow>(
    `UPDATE organizations
     SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, name, slug, tracker_org_id, settings,
               sync_next_run_at, initial_sync_completed_at, created_at, updated_at`,
    values
  );
  return res.rows[0] ?? null;
}

interface InsertOrganizationInput {
  name: string;
  settings?: Record<string, unknown>;
  slug?: string | null;
  tracker_org_id?: string;
}

export async function insertOrganization(
  input: InsertOrganizationInput
): Promise<OrganizationRow> {
  const res = await query<OrganizationRow>(
    `INSERT INTO organizations (name, slug, tracker_org_id, settings)
     VALUES ($1, $2, COALESCE($3, ''), COALESCE($4, '{}'::jsonb))
     RETURNING id, name, slug, tracker_org_id, settings,
               sync_next_run_at, initial_sync_completed_at, created_at, updated_at`,
    [
      input.name,
      input.slug ?? null,
      input.tracker_org_id ?? null,
      input.settings ?? null,
    ]
  );
  const row = res.rows[0];
  if (!row) {
    throw new Error('insertOrganization: no row returned');
  }
  return row;
}

/**
 * Все организации для супер-админа: в админке отображаются как org_admin (управление любой org).
 */
export async function listAllOrganizationsAdminSummaries(): Promise<UserOrganizationSummary[]> {
  const res = await query<{
    initial_sync_completed_at: Date | null;
    name: string;
    organization_id: string;
    slug: string | null;
  }>(
    `SELECT o.id AS organization_id, o.name, o.slug, o.initial_sync_completed_at
     FROM organizations o
     ORDER BY o.name ASC`
  );
  return res.rows.map((row) => ({
    ...row,
    role: 'org_admin' as const,
    canAccessAdmin: true,
    canUsePlanner: true,
    managedTeamIds: null,
  }));
}
