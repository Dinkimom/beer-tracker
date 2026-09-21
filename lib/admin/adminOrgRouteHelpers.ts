import { NextResponse } from 'next/server';

import { requireOrgAdmin, requireTenantForOrganization } from '@/lib/api-tenant';
import { findOrganizationById } from '@/lib/organizations';

export { parseJsonRequestBody } from '@/lib/http/parseJsonRequestBody';

type OrgRouteAuth =
  | { ctx: { organizationId: string; userId: string } }
  | { response: NextResponse };

export async function requireOrgMemberForOrganizationRoute(
  request: Request,
  organizationId: string
): Promise<OrgRouteAuth> {
  const auth = await requireTenantForOrganization(request, organizationId);
  if (auth.response) {
    return { response: auth.response };
  }
  return { ctx: auth.ctx };
}

export async function requireOrgAdminForOrganizationRoute(
  request: Request,
  organizationId: string
): Promise<OrgRouteAuth> {
  const auth = await requireTenantForOrganization(request, organizationId);
  if (auth.response) {
    return { response: auth.response };
  }
  const denied = requireOrgAdmin(auth.ctx);
  if (denied) {
    return { response: denied };
  }
  return { ctx: auth.ctx };
}

export async function requireMemberOrganization(
  request: Request,
  organizationId: string
): Promise<
  | NextResponse
  | { org: NonNullable<Awaited<ReturnType<typeof findOrganizationById>>>; userId: string }
> {
  const auth = await requireOrgMemberForOrganizationRoute(request, organizationId);
  if ('response' in auth) {
    return auth.response;
  }
  const org = await findOrganizationById(auth.ctx.organizationId);
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }
  return { org, userId: auth.ctx.userId };
}
