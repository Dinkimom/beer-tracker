import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';
import { deleteUserNotification } from '@/lib/notifications/userNotificationsRepository';

/**
 * DELETE /api/notifications/[notificationId]
 */
export async function DELETE(
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

    const deleted = await deleteUserNotification({
      notificationId,
      organizationId,
      recipientUserId: userId,
    });

    if (!deleted) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /notifications/...]', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
