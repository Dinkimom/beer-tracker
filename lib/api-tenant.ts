/**
 * Tenant guard: сессия продукта + организация (членство в organization_members).
 * Заголовок X-Organization-Id — для маршрутов без organizationId в пути.
 */

import type { OrgMemberRole } from '@/lib/organizations/types';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { logAdminAccessDenied } from '@/lib/access/adminAccessAudit';
import {
  type AccessProfile,
  canAccessAdminShell,
  canManageTeamInAdmin,
  canUsePlanner,
  resolveAccessProfile,
} from '@/lib/access/orgAccess';
import { getProductUserIdFromRequest } from '@/lib/auth/productSession';
import { isProductSuperAdmin } from '@/lib/auth/superAdmin';
import { findOrganizationMembership } from '@/lib/organizations/organizationMembersRepository';
import { findOrganizationById } from '@/lib/organizations/organizationRepository';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';

import { resolveOnPremTenantContext } from './api/apiTenantHelpers';

export { TENANT_ORG_HEADER };

const UuidSchema = z.string().uuid();

async function resolveTenantContextForUser(
  organizationId: string,
  userId: string
): Promise<TenantContext | null> {
  const membership = await findOrganizationMembership(organizationId, userId);
  if (membership) {
    return {
      organizationId,
      role: membership.role,
      userId,
    };
  }
  if (await isProductSuperAdmin(userId)) {
    const org = await findOrganizationById(organizationId);
    if (org) {
      return {
        organizationId,
        role: 'org_admin',
        userId,
      };
    }
  }
  return null;
}

export interface TenantContext {
  organizationId: string;
  role: OrgMemberRole;
  userId: string;
}

/** Членство в организации (без профиля команд). */
type RequireTenantResult =
  | { ctx: TenantContext; response?: never }
  | { ctx?: never; response: NextResponse };

/** Заголовок tenant + доступ к планеру (после {@link requireTenantContext}). */
export type RequirePlannerTenantResult =
  | { ctx: TenantContext; profile: AccessProfile }
  | { response: NextResponse };

type TenantWithAdminProfileResult =
  | { ctx: TenantContext; profile: AccessProfile }
  | { response: NextResponse };

/**
 * On-prem tenant: заголовок {@link TENANT_ORG_HEADER} или первая организация в БД.
 * SaaS-проверки членства / canUsePlanner отложены.
 */
export function requireTenantContext(request: Request): Promise<RequirePlannerTenantResult> {
  return resolveOnPremTenantContext(request);
}

/**
 * Проверяет сессию и членство в организации по id из пути (без заголовка).
 */
export async function requireTenantForOrganization(
  request: Request,
  organizationIdRaw: string
): Promise<RequireTenantResult> {
  const userId = getProductUserIdFromRequest(request);
  if (!userId) {
    return {
      response: NextResponse.json({ error: 'Требуется вход' }, { status: 401 }),
    };
  }
  const orgParsed = UuidSchema.safeParse(organizationIdRaw.trim());
  if (!orgParsed.success) {
    return {
      response: NextResponse.json({ error: 'Некорректный organization id' }, { status: 400 }),
    };
  }
  const organizationId = orgParsed.data;
  const ctx = await resolveTenantContextForUser(organizationId, userId);
  if (!ctx) {
    return {
      response: NextResponse.json({ error: 'Нет доступа к организации' }, { status: 403 }),
    };
  }
  return { ctx };
}

/**
 * Доступ только перечисленным ролям (например только org_admin).
 */
function requireOrgRoles(
  ctx: TenantContext,
  allowed: readonly OrgMemberRole[]
): NextResponse | null {
  if (!allowed.includes(ctx.role)) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }
  return null;
}

/** Сокращение для операций администратора организации. */
export function requireOrgAdmin(ctx: TenantContext): NextResponse | null {
  return requireOrgRoles(ctx, ['org_admin']);
}

/**
 * Сессия + членство в org + профиль команд (для админки: только org_admin).
 * Участник без строки в beer_tracker.admins получает 403.
 */
export async function requireTenantWithAdminProfile(
  request: Request,
  organizationIdRaw: string
): Promise<TenantWithAdminProfileResult> {
  const auth = await requireTenantForOrganization(request, organizationIdRaw);
  if (auth.response) {
    return { response: auth.response };
  }
  const profile = await resolveAccessProfile(auth.ctx.userId, auth.ctx.organizationId);
  if (!profile) {
    logAdminAccessDenied('admin_shell', { organizationId: auth.ctx.organizationId });
    return { response: NextResponse.json({ error: 'Нет доступа к организации' }, { status: 403 }) };
  }
  if (!canAccessAdminShell(profile)) {
    logAdminAccessDenied('admin_shell', { organizationId: profile.organizationId });
    return { response: NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 }) };
  }
  return { ctx: auth.ctx, profile };
}

/**
 * Сессия + членство в org + доступ к планеру (org_admin или назначенная команда).
 * Участник org без команд — 403 (согласовано с {@link canUsePlanner} и главной).
 */
export async function requireTenantWithPlannerProfile(
  request: Request,
  organizationIdRaw: string
): Promise<TenantWithAdminProfileResult> {
  const auth = await requireTenantForOrganization(request, organizationIdRaw);
  if (auth.response) {
    return { response: auth.response };
  }
  const profile = await resolveAccessProfile(auth.ctx.userId, auth.ctx.organizationId);
  if (!profile) {
    logAdminAccessDenied('admin_shell', { organizationId: auth.ctx.organizationId });
    return { response: NextResponse.json({ error: 'Нет доступа к организации' }, { status: 403 }) };
  }
  if (!canUsePlanner(profile)) {
    logAdminAccessDenied('planner_access', { organizationId: profile.organizationId });
    return { response: NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 }) };
  }
  return { ctx: auth.ctx, profile };
}

/**
 * Админка организации: сессия + {@link requireTenantWithAdminProfile} + только org_admin.
 */
export async function requireTenantOrgAdmin(
  request: Request,
  organizationIdRaw: string
): Promise<TenantWithAdminProfileResult> {
  const auth = await requireTenantWithAdminProfile(request, organizationIdRaw);
  if ('response' in auth) {
    return auth;
  }
  const denied = requireOrgAdminProfile(auth.profile);
  if (denied) {
    return { response: denied };
  }
  return auth;
}

/** Только org_admin по профилю (не путать с {@link requireOrgAdmin} по роли из ctx). */
export function requireOrgAdminProfile(profile: AccessProfile): NextResponse | null {
  if (profile.orgRole !== 'org_admin') {
    logAdminAccessDenied('org_admin_profile', { organizationId: profile.organizationId });
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }
  return null;
}

export function requireTeamManagementAccess(
  profile: AccessProfile,
  teamId: string
): NextResponse | null {
  if (canManageTeamInAdmin(profile, teamId)) {
    return null;
  }
  logAdminAccessDenied('team_management', {
    organizationId: profile.organizationId,
    teamId,
  });
  return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
}

/**
 * Когда используют и путь, и заголовок — совпадение обязательно (защита от подмены).
 */
export function requireTenantPathMatchesHeader(
  ctx: TenantContext,
  pathOrganizationId: string
): NextResponse | null {
  const parsed = UuidSchema.safeParse(pathOrganizationId.trim());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректный organization id' }, { status: 400 });
  }
  if (parsed.data !== ctx.organizationId) {
    return NextResponse.json(
      { error: `${TENANT_ORG_HEADER} не совпадает с организацией ресурса` },
      { status: 400 }
    );
  }
  return null;
}
