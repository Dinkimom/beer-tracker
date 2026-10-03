import { NextResponse } from 'next/server';

import { requireAdminOrganization } from '@/lib/admin/adminOrgSyncActionHelpers';
import {
  readRetroColumnTemplate,
  saveRetroColumnTemplate,
} from '@/lib/retro/retroColumnTemplateRepository';

/**
 * GET /api/admin/organizations/[organizationId]/retro-template
 * Шаблон колонок ретро. Если строка не сохранена, отдаёт встроенный набор.
 */
export async function GET(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const authResult = await requireAdminOrganization(request, organizationId);
  if (authResult instanceof NextResponse) return authResult;
  const template = await readRetroColumnTemplate(authResult.org.id);
  return NextResponse.json(template);
}

/**
 * PUT /api/admin/organizations/[organizationId]/retro-template
 * Пишет только шаблон. Доски спринтов не обновляет.
 */
export async function PUT(
  request: Request,
  routeContext: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await routeContext.params;
  const authResult = await requireAdminOrganization(request, organizationId);
  if (authResult instanceof NextResponse) return authResult;
  const body: unknown = await request.json().catch(() => null);
  const saved = await saveRetroColumnTemplate(authResult.org.id, body);
  if (!saved) {
    return NextResponse.json({ error: 'Некорректный шаблон колонок' }, { status: 400 });
  }
  return NextResponse.json(saved);
}
