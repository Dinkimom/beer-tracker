import type { NotificationKind, NotificationPayload, UserNotificationDto, UserNotificationRow } from './types';

import { query } from '@/lib/db';
import { ensureUserNotificationsTable } from '@/lib/notifications/ensureUserNotificationsTable';

function rowToDto(row: UserNotificationRow): UserNotificationDto {
  return {
    id: row.id,
    kind: row.kind,
    payload: row.payload ?? {},
    actorUserId: row.actor_user_id,
    readAt: row.read_at ? row.read_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

export async function insertUserNotifications(input: {
  actorUserId?: string | null;
  kind: NotificationKind;
  organizationId: string;
  payload: NotificationPayload;
  recipientUserIds: string[];
}): Promise<void> {
  await ensureUserNotificationsTable();
  const uniqueRecipients = [...new Set(input.recipientUserIds.filter(Boolean))];
  if (uniqueRecipients.length === 0) {
    return;
  }

  const actorUserId = input.actorUserId ?? null;
  const payloadJson = JSON.stringify(input.payload);

  for (const recipientUserId of uniqueRecipients) {
    await query(
      `INSERT INTO user_notifications (
         organization_id, recipient_user_id, actor_user_id, kind, payload
       )
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [input.organizationId, recipientUserId, actorUserId, input.kind, payloadJson]
    );
  }
}

export async function listUserNotifications(input: {
  limit?: number;
  organizationId: string;
  recipientUserId: string;
}): Promise<UserNotificationDto[]> {
  await ensureUserNotificationsTable();
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const result = await query<UserNotificationRow>(
    `SELECT id, organization_id, recipient_user_id, actor_user_id, kind, payload, read_at, created_at
     FROM user_notifications
     WHERE organization_id = $1 AND recipient_user_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [input.organizationId, input.recipientUserId, limit]
  );
  return result.rows.map(rowToDto);
}

export async function countUnreadUserNotifications(input: {
  organizationId: string;
  recipientUserId: string;
}): Promise<number> {
  await ensureUserNotificationsTable();
  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM user_notifications
     WHERE organization_id = $1
       AND recipient_user_id = $2
       AND read_at IS NULL`,
    [input.organizationId, input.recipientUserId]
  );
  return Number.parseInt(result.rows[0]?.count ?? '0', 10);
}

export async function markAllUserNotificationsRead(input: {
  organizationId: string;
  recipientUserId: string;
}): Promise<number> {
  await ensureUserNotificationsTable();
  const result = await query<{ id: string }>(
    `UPDATE user_notifications
     SET read_at = CURRENT_TIMESTAMP
     WHERE organization_id = $1
       AND recipient_user_id = $2
       AND read_at IS NULL
     RETURNING id`,
    [input.organizationId, input.recipientUserId]
  );
  return result.rows.length;
}

export async function markUserNotificationRead(input: {
  notificationId: string;
  organizationId: string;
  recipientUserId: string;
}): Promise<boolean> {
  await ensureUserNotificationsTable();
  const result = await query<{ id: string }>(
    `UPDATE user_notifications
     SET read_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND organization_id = $2
       AND recipient_user_id = $3
       AND read_at IS NULL
     RETURNING id`,
    [input.notificationId, input.organizationId, input.recipientUserId]
  );
  return result.rows.length > 0;
}

export async function deleteAllUserNotifications(input: {
  organizationId: string;
  recipientUserId: string;
}): Promise<number> {
  await ensureUserNotificationsTable();
  const result = await query<{ id: string }>(
    `DELETE FROM user_notifications
     WHERE organization_id = $1 AND recipient_user_id = $2
     RETURNING id`,
    [input.organizationId, input.recipientUserId]
  );
  return result.rows.length;
}

export async function deleteUserNotification(input: {
  notificationId: string;
  organizationId: string;
  recipientUserId: string;
}): Promise<boolean> {
  await ensureUserNotificationsTable();
  const result = await query<{ id: string }>(
    `DELETE FROM user_notifications
     WHERE id = $1
       AND organization_id = $2
       AND recipient_user_id = $3
     RETURNING id`,
    [input.notificationId, input.organizationId, input.recipientUserId]
  );
  return result.rows.length > 0;
}
