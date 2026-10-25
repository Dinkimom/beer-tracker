import type { QueryParams } from '@/types';

import { query } from '@/lib/db';

export async function insertAnalyticsEvents(input: {
  events: Array<{
    eventName: string;
    occurredAt: Date;
    payload: Record<string, unknown>;
  }>;
  organizationId: string;
  userId: string | null;
}): Promise<number> {
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
