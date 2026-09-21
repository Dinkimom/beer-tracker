import { z } from 'zod';

import { insertAnalyticsEvents } from './analyticsEventsRepository';
import { parseAnalyticsIngestBody } from './analyticsIngestParse';

const UuidSchema = z.string().uuid();

export function resolveAnalyticsUserId(rawUserId: string): string | null {
  const parsed = UuidSchema.safeParse(rawUserId);
  return parsed.success ? parsed.data : null;
}

export async function persistAnalyticsIngest(input: {
  body: unknown;
  organizationId: string;
  userId: string;
}): Promise<{ accepted: number; error?: string; status: number }> {
  const events = parseAnalyticsIngestBody(input.body);
  if (!events) {
    return { accepted: 0, error: 'Некорректное тело запроса', status: 400 };
  }
  if (events.length === 0) {
    return { accepted: 0, status: 200 };
  }
  const accepted = await insertAnalyticsEvents({
    events,
    organizationId: input.organizationId,
    userId: resolveAnalyticsUserId(input.userId),
  });
  return { accepted, status: 200 };
}
