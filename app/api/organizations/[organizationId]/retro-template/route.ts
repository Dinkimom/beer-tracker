import { NextResponse } from 'next/server';

import { requireTenantWithPlannerProfile } from '@/lib/api-tenant';
import { readRetroColumnTemplate } from '@/lib/retro/retroColumnTemplateRepository';

/**
 * GET /api/organizations/[organizationId]/retro-template
 * Колонки для новой доски ретро. Секретов нет. Сохранённые доски не читает.
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const auth = await requireTenantWithPlannerProfile(request, organizationId);
  if ('response' in auth) return auth.response;
  const template = await readRetroColumnTemplate(auth.ctx.organizationId);
  return NextResponse.json(template);
}
