/**
 * CRUD org_roles и связанные операции (PostgreSQL, схема beer_tracker).
 */

import type { DomainRole, Platform } from '@/lib/roles/catalog';
import type { QueryParams } from '@/types';

import { pool, qualifyBeerTrackerTables, query } from '@/lib/db';

export interface OrgRoleRow {
  created_at: Date;
  domain_role: DomainRole;
  id: string;
  organization_id: string;
  platforms: Platform[];
  slug: string;
  title: string;
  updated_at: Date;
}

function parseDomainRole(value: string): DomainRole {
  if (value === 'developer' || value === 'tester' || value === 'other') return value;
  return 'other';
}

function parsePlatforms(value: unknown): Platform[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is Platform => x === 'back' || x === 'web');
}

function mapRow(r: {
  id: string;
  organization_id: string;
  slug: string;
  title: string;
  domain_role: string;
  platforms: unknown;
  created_at: Date;
  updated_at: Date;
}): OrgRoleRow {
  return {
    id: r.id,
    organization_id: r.organization_id,
    slug: r.slug,
    title: r.title,
    domain_role: parseDomainRole(r.domain_role),
    platforms: parsePlatforms(r.platforms),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

interface OrgRoleDbRow {
  created_at: Date;
  domain_role: string;
  id: string;
  organization_id: string;
  platforms: unknown;
  slug: string;
  title: string;
  updated_at: Date;
}

export async function listOrgRoles(organizationId: string): Promise<OrgRoleRow[]> {
  const res = await query<OrgRoleDbRow>(
    `SELECT id, organization_id, slug, title, domain_role, platforms, created_at, updated_at
     FROM org_roles
     WHERE organization_id = $1::uuid
     ORDER BY title ASC, slug ASC`,
    [organizationId]
  );
  return res.rows.map(mapRow);
}

export async function createOrgRole(
  organizationId: string,
  data: { slug: string; title: string; domainRole: DomainRole; platforms: Platform[] }
): Promise<OrgRoleRow | null> {
  const slugNorm = data.slug.trim().toLowerCase();
  const res = await query<OrgRoleDbRow>(
    `INSERT INTO org_roles (organization_id, slug, title, domain_role, platforms)
     VALUES ($1::uuid, $2, $3, $4, $5::jsonb)
     ON CONFLICT (organization_id, slug) DO NOTHING
     RETURNING id, organization_id, slug, title, domain_role, platforms, created_at, updated_at`,
    [organizationId, slugNorm, data.title.trim(), data.domainRole, JSON.stringify(data.platforms)]
  );
  const row = res.rows[0];
  return row ? mapRow(row) : null;
}

export async function updateOrgRole(
  organizationId: string,
  slug: string,
  data: { title?: string; domainRole?: DomainRole; platforms?: Platform[] }
): Promise<OrgRoleRow | null> {
  const res = await query<OrgRoleDbRow>(
    `UPDATE org_roles
     SET title = COALESCE($3, title),
         domain_role = COALESCE($4, domain_role),
         platforms = COALESCE($5::jsonb, platforms),
         updated_at = CURRENT_TIMESTAMP
     WHERE organization_id = $1::uuid AND slug = $2
     RETURNING id, organization_id, slug, title, domain_role, platforms, created_at, updated_at`,
    [
      organizationId,
      slug,
      data.title !== undefined ? data.title.trim() : null,
      data.domainRole !== undefined ? data.domainRole : null,
      data.platforms !== undefined ? JSON.stringify(data.platforms) : null,
    ]
  );
  const row = res.rows[0];
  return row ? mapRow(row) : null;
}

/**
 * В одной транзакции: удалить org-роль и обнулить role_slug у участников команд этой организации с тем же slug.
 */
export async function deleteOrgRoleAndClearMembers(
  organizationId: string,
  slug: string
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const run = async (text: string, values?: QueryParams) => {
      await client.query(qualifyBeerTrackerTables(text), values);
    };
    const del = await client.query<{ id: string }>(
      qualifyBeerTrackerTables(
        `DELETE FROM org_roles
         WHERE organization_id = $1::uuid AND lower(slug) = lower($2)
         RETURNING id`
      ),
      [organizationId, slug]
    );
    if ((del.rowCount ?? 0) === 0) {
      await client.query('ROLLBACK');
      return false;
    }
    await run(
      `UPDATE team_members tm
       SET role_slug = NULL
       FROM teams t
       WHERE tm.team_id = t.id
         AND t.organization_id = $1::uuid
         AND tm.role_slug IS NOT NULL
         AND lower(tm.role_slug) = lower($2)`,
      [organizationId, slug]
    );
    await client.query('COMMIT');
    return true;
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }
}
