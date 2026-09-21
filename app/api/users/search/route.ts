import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { searchStaffInOrg } from '@/lib/staffTeams';

/**
 * GET /api/users/search?q={query}
 * Поиск сотрудников организации (staff) по имени и email.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId } = tenantResult.ctx;

    const q = request.nextUrl.searchParams.get('q') ?? '';
    const items = await searchStaffInOrg(organizationId, q);
    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error, 'search staff');
  }
}
