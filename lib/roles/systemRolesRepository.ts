/**
 * Чтение глобального справочника system_roles (PostgreSQL, схема beer_tracker).
 */

import type { DomainRole, Platform } from '@/lib/roles/catalog';

import { query } from '@/lib/db';

export interface SystemRoleRow {
  created_at: Date;
  domain_role: DomainRole;
  id: string;
  platforms: Platform[];
  slug: string;
  sort_order: number;
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
  slug: string;
  title: string;
  domain_role: string;
  platforms: unknown;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}): SystemRoleRow {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    domain_role: parseDomainRole(r.domain_role),
    platforms: parsePlatforms(r.platforms),
    sort_order: r.sort_order,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/** Все системные роли: sort_order, затем slug. */
export async function listSystemRoles(): Promise<SystemRoleRow[]> {
  const res = await query<{
    id: string;
    slug: string;
    title: string;
    domain_role: string;
    platforms: unknown;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, slug, title, domain_role, platforms, sort_order, created_at, updated_at
     FROM system_roles
     ORDER BY sort_order ASC, slug ASC`
  );
  return res.rows.map(mapRow);
}

/** Проверка коллизии slug при создании org-роли (регистронезависимо). */
export async function systemRoleSlugExists(slug: string): Promise<boolean> {
  const res = await query<{ one: number }>(
    `SELECT 1 AS one FROM system_roles WHERE lower(slug) = lower($1) LIMIT 1`,
    [slug]
  );
  return res.rows.length > 0;
}
