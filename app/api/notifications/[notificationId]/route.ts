import { NextRequest } from 'next/server';

import { runOwnNotificationAction } from '@/lib/notifications/ownNotificationRoute';
import { deleteUserNotification } from '@/lib/notifications/userNotificationsRepository';

/**
 * DELETE /api/notifications/[notificationId]
 */
export function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> | { notificationId: string } }
) {
  return runOwnNotificationAction(request, params, {
    apply: deleteUserNotification,
    failureMessage: 'Failed to delete notification',
    logTag: '[DELETE /notifications/...]',
  });
}
