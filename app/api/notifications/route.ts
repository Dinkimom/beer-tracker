import { NextRequest, NextResponse } from 'next/server';

import { requireTenantContext } from '@/lib/api-tenant';
import { enrichNotificationsWithActors } from '@/lib/notifications/enrichNotificationsWithActors';
import {
  countUnreadUserNotifications,
  deleteAllUserNotifications,
  listUserNotifications,
  markAllUserNotificationsRead,
} from '@/lib/notifications/userNotificationsRepository';

/**
 * GET /api/notifications — список уведомлений текущего пользователя.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId, userId } = tenantResult.ctx;
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

    const [notifications, unreadCount] = await Promise.all([
      listUserNotifications({ organizationId, recipientUserId: userId, limit }),
      countUnreadUserNotifications({ organizationId, recipientUserId: userId }),
    ]);

    const enrichedNotifications = await enrichNotificationsWithActors(notifications);

    return NextResponse.json({ notifications: enrichedNotifications, unreadCount });
  } catch (error) {
    console.error('[GET /notifications]', error);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications — пометить все как прочитанные.
 */
export async function PATCH(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId, userId } = tenantResult.ctx;

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (
      typeof json !== 'object' ||
      json == null ||
      !('markAllRead' in json) ||
      (json as { markAllRead?: boolean }).markAllRead !== true
    ) {
      return NextResponse.json({ error: 'Unsupported patch' }, { status: 400 });
    }

    const marked = await markAllUserNotificationsRead({
      organizationId,
      recipientUserId: userId,
    });

    return NextResponse.json({ success: true, marked });
  } catch (error) {
    console.error('[PATCH /notifications]', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications — удалить все уведомления текущего пользователя.
 */
export async function DELETE(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId, userId } = tenantResult.ctx;

    const deleted = await deleteAllUserNotifications({
      organizationId,
      recipientUserId: userId,
    });

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error('[DELETE /notifications]', error);
    return NextResponse.json({ error: 'Failed to clear notifications' }, { status: 500 });
  }
}
