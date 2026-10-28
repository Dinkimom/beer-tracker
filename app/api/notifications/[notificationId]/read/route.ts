import { NextRequest } from 'next/server';

import { runOwnNotificationAction } from '@/lib/notifications/ownNotificationRoute';
import { markUserNotificationRead } from '@/lib/notifications/userNotificationsRepository';

/**
 * PATCH /api/notifications/[notificationId]/read
 */
export function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> | { notificationId: string } }
) {
  return runOwnNotificationAction(request, params, {
    apply: markUserNotificationRead,
    failureMessage: 'Failed to mark notification read',
    logTag: '[PATCH /notifications/.../read]',
  });
}
