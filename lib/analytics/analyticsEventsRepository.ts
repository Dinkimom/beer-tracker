import type { QueryParams } from '@/types';

import { query } from '@/lib/db';
import { getBeerTrackerSchema } from '@/lib/env';

let tablesEnsured = false;

function qualifySchemaName(schema: string): string {
  return schema.includes('-') ? `"${schema}"` : schema;
}

/**
 * Идемпотентно создаёт analytics_events на БД, развёрнутых до появления таблицы в init.sql.
 */
async function ensureAnalyticsEventsTable(): Promise<void> {
  if (tablesEnsured) {
    return;
  }
  const schema = qualifySchemaName(getBeerTrackerSchema());
  await query(`
    CREATE TABLE IF NOT EXISTS ${schema}.analytics_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
      user_id UUID,
      event_name TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
      ingested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    ALTER TABLE ${schema}.analytics_events
      DROP CONSTRAINT IF EXISTS analytics_events_user_id_fkey
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_analytics_events_org_name_time
      ON ${schema}.analytics_events (organization_id, event_name, occurred_at DESC)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_analytics_events_user_name_time
      ON ${schema}.analytics_events (user_id, event_name, occurred_at DESC)
      WHERE user_id IS NOT NULL
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time_identified
      ON ${schema}.analytics_events (event_name, occurred_at DESC)
      WHERE user_id IS NOT NULL
  `);
  tablesEnsured = true;
}

export async function insertAnalyticsEvents(input: {
  events: Array<{
    eventName: string;
    occurredAt: Date;
    payload: Record<string, unknown>;
  }>;
  organizationId: string;
  userId: string | null;
}): Promise<number> {
  await ensureAnalyticsEventsTable();
  if (input.events.length === 0) {
    return 0;
  }
  const values: QueryParams = [];
  const placeholders = input.events.map((event, index) => {
    const offset = index * 5;
    values.push(
      input.organizationId,
      input.userId,
      event.eventName,
      JSON.stringify(event.payload),
      event.occurredAt
    );
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}::jsonb, $${offset + 5})`;
  });
  await query(
    `INSERT INTO analytics_events (organization_id, user_id, event_name, payload, occurred_at)
     VALUES ${placeholders.join(', ')}`,
    values
  );
  return input.events.length;
}

/** Для тестов. */
export function resetAnalyticsEventsTableEnsured(): void {
  tablesEnsured = false;
}
