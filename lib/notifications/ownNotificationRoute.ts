import { NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { resolveParams } from '@/lib/nextjs-utils';

/**
 * Роуты `/api/notifications/[notificationId]/…`: действие над своим уведомлением в текущей
 * организации. `apply` вернул false — уведомления нет (или оно чужое) → 404.
 */
export async function runOwnNotificationAction(
  request: Request,
  params: Promise<{ notificationId: string }> | { notificationId: string },
  action: {
    apply: (input: {
      notificationId: string;
      organizationId: string;
      recipientUserId: string;
    }) => Promise<boolean>;
    failureMessage: string;
    logTag: string;
  }
): Promise<NextResponse> {
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
    const applied = await action.apply({ notificationId, organizationId, recipientUserId: userId });
    if (!applied) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(action.logTag, error);
    return NextResponse.json({ error: action.failureMessage }, { status: 500 });
  }
}
