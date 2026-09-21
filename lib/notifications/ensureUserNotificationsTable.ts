import { query } from '@/lib/db';
import { getBeerTrackerSchema } from '@/lib/env';

const USER_NOTIFICATION_KINDS = [
  'assignee_changed',
  'availability_changed',
  'comment_mention',
  'sprint_started',
  'sprint_finished',
] as const;

let tableEnsured = false;

function qualifySchemaName(schema: string): string {
  return schema.includes('-') ? `"${schema}"` : schema;
}

function userNotificationKindCheckSql(schema: string): string {
  const kinds = USER_NOTIFICATION_KINDS.map((kind) => `'${kind}'`).join(',\n          ');
  return `
    ALTER TABLE ${schema}.user_notifications
      DROP CONSTRAINT IF EXISTS user_notifications_kind_check;
    ALTER TABLE ${schema}.user_notifications
      ADD CONSTRAINT user_notifications_kind_check CHECK (
        kind IN (
          ${kinds}
        )
      );
  `;
}

/** Идемпотентно создаёт user_notifications на БД без миграции add-user-notifications.sql. */
export async function ensureUserNotificationsTable(): Promise<void> {
  if (tableEnsured) {
    return;
  }
  const schema = qualifySchemaName(getBeerTrackerSchema());
  await query(`
    CREATE TABLE IF NOT EXISTS ${schema}.user_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
      recipient_user_id UUID NOT NULL,
      actor_user_id UUID,
      kind TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      read_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT user_notifications_kind_check CHECK (
        kind IN (
          'assignee_changed',
          'availability_changed',
          'comment_mention',
          'sprint_started',
          'sprint_finished'
        )
      )
    )
  `);
  await query(userNotificationKindCheckSql(schema));
  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_created
      ON ${schema}.user_notifications (organization_id, recipient_user_id, created_at DESC)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_unread
      ON ${schema}.user_notifications (organization_id, recipient_user_id, created_at DESC)
      WHERE read_at IS NULL
  `);
  tableEnsured = true;
}

/** Сброс кэша ensure (только для тестов). */
export function resetUserNotificationsTableEnsuredForTests(): void {
  tableEnsured = false;
}
