import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { markUserNotificationRead } from '@/lib/notifications/userNotificationsRepository';

/**
 * PATCH /api/notifications/[notificationId]/read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> | { notificationId: string } }
) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId, userId } = tenantResult.ctx;
    const { notificationId } = await resolveParams(params);

    if (!notificationId) {
      return NextResponse.json({ error: 'notificationId is required' }, { status: 400 });
    }

    const marked = await markUserNotificationRead({
      notificationId,
      organizationId,
      recipientUserId: userId,
    });

    if (!marked) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PATCH /notifications/.../read]', error);
    return NextResponse.json({ error: 'Failed to mark notification read' }, { status: 500 });
  }
}
