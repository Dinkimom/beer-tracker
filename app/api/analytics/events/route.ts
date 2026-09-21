import { NextRequest, NextResponse } from 'next/server';

import { persistAnalyticsIngest } from '@/lib/analytics/analyticsIngestRouteHelpers';
import { requireTenantContext } from '@/lib/api-tenant';

/**
 * POST /api/analytics/events — батч событий (настройки, просмотры, клики).
 */
export async function POST(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
    }
    const result = await persistAnalyticsIngest({
      body: json,
      organizationId: tenantResult.ctx.organizationId,
      userId: tenantResult.ctx.userId,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ accepted: result.accepted });
  } catch (error) {
    console.error('[POST /analytics/events]', error);
    return NextResponse.json({ error: 'Не удалось записать аналитику' }, { status: 500 });
  }
}
