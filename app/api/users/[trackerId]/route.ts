import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { getStaffByTrackerUserIdInOrg } from '@/lib/staffTeams';

/**
 * GET /api/users/[trackerId]
 * Сотрудник по Tracker user id в разрезе организации (tenant).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackerId: string }> | { trackerId: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId } = tenantResult.ctx;

    const { trackerId } = await resolveParams(params);
    if (!trackerId) {
      return NextResponse.json({ error: 'trackerId is required' }, { status: 400 });
    }
    const employee = await getStaffByTrackerUserIdInOrg(organizationId, trackerId);
    if (!employee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(employee);
  } catch (error) {
    return handleApiError(error, 'get staff by tracker id');
  }
}
