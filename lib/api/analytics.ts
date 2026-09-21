import type { AnalyticsEventName } from '@/lib/analytics/analyticsEventNames';

import { redactAnalyticsPayloadForClient } from '@/lib/analytics/analyticsSecretRedaction';
import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

interface AnalyticsEventInput {
  eventName: AnalyticsEventName;
  occurredAt?: string;
  payload: Record<string, unknown>;
}

/**
 * Запись событий в общую таблицу analytics_events.
 * Ошибки глотаются: аналитика не должна ломать UI.
 */
export async function ingestAnalyticsEvents(events: AnalyticsEventInput[]): Promise<boolean> {
  if (events.length === 0) {
    return true;
  }
  try {
    const eventsToSend = events.map((event) => ({
      ...event,
      payload: redactAnalyticsPayloadForClient(event.payload),
    }));
    await getPlannerBeerTrackerApi().post('/analytics/events', { events: eventsToSend });
    return true;
  } catch (error) {
    console.error('[analytics] ingest failed', error);
    return false;
  }
}
