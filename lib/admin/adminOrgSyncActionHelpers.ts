import { NextResponse } from 'next/server';
import { z } from 'zod';

import { findOrganizationById } from '@/lib/organizations';

import { parseJsonRequestBody, requireOrgAdminForOrganizationRoute } from './adminOrgRouteHelpers';

export async function requireAdminOrganization(
  request: Request,
  organizationId: string
): Promise<
  | NextResponse
  | { org: NonNullable<Awaited<ReturnType<typeof findOrganizationById>>>; userId: string }
> {
  const auth = await requireOrgAdminForOrganizationRoute(request, organizationId);
  if ('response' in auth) {
    return auth.response;
  }
  const org = await findOrganizationById(auth.ctx.organizationId);
  if (!org) {
    return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
  }
  return { org, userId: auth.ctx.userId };
}

export async function parseAdminOrgJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  errorMessage: string
): Promise<NextResponse | T> {
  const json = await parseJsonRequestBody(request);
  if (json instanceof NextResponse) {
    return json;
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
  return parsed.data;
}
