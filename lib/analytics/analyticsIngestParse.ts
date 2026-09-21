import { z } from 'zod';

import { ANALYTICS_EVENT, ANALYTICS_EVENT_NAMES, type AnalyticsEventName } from './analyticsEventNames';
import { stripForbiddenAnalyticsKeys } from './analyticsSecretRedaction';
import {
  CLIENT_SETTINGS_FIELD_KEYS,
  CLIENT_SETTINGS_PAYLOAD_VERSION,
} from './clientSettingsAllowlist';

const ANALYTICS_MAX_EVENTS_PER_REQUEST = 50;
const ANALYTICS_MAX_PAYLOAD_BYTES = 32_768;
const ANALYTICS_MAX_OCCURRED_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE_VIEW_PATH_MAX = 512;
const PAGE_VIEW_SEARCH_MAX = 256;

const AnalyticsEventBodySchema = z.object({
  eventName: z.enum(ANALYTICS_EVENT_NAMES),
  occurredAt: z.string().datetime().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

const IngestBodySchema = z.object({
  events: z.array(AnalyticsEventBodySchema).min(1).max(ANALYTICS_MAX_EVENTS_PER_REQUEST),
});

interface ParsedAnalyticsEvent {
  eventName: AnalyticsEventName;
  occurredAt: Date;
  payload: Record<string, unknown>;
}

function asPayloadRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function isPayloadSizeOk(payload: Record<string, unknown>): boolean {
  try {
    return JSON.stringify(payload).length <= ANALYTICS_MAX_PAYLOAD_BYTES;
  } catch {
    return false;
  }
}

export function sanitizeClientSettingsPayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const version = typeof payload.v === 'number' ? payload.v : CLIENT_SETTINGS_PAYLOAD_VERSION;
  const out: Record<string, unknown> = { v: version };
  for (const key of CLIENT_SETTINGS_FIELD_KEYS) {
    if (key in payload) {
      out[key] = payload[key];
    }
  }
  return out;
}

function sanitizePageViewPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const path = typeof payload.path === 'string' ? payload.path.slice(0, PAGE_VIEW_PATH_MAX) : '';
  const out: Record<string, unknown> = { path, v: 1 };
  if (typeof payload.search === 'string' && payload.search.length > 0) {
    out.search = payload.search.slice(0, PAGE_VIEW_SEARCH_MAX);
  }
  return out;
}

export function sanitizeAnalyticsPayload(
  eventName: AnalyticsEventName,
  payload: Record<string, unknown>
): Record<string, unknown> | null {
  const stripped = asPayloadRecord(stripForbiddenAnalyticsKeys(payload));
  if (!stripped || !isPayloadSizeOk(stripped)) {
    return null;
  }
  if (eventName === ANALYTICS_EVENT.clientSettings) {
    return asPayloadRecord(stripForbiddenAnalyticsKeys(sanitizeClientSettingsPayload(stripped)));
  }
  if (eventName === ANALYTICS_EVENT.pageView) {
    return asPayloadRecord(stripForbiddenAnalyticsKeys(sanitizePageViewPayload(stripped)));
  }
  return stripped;
}

export function resolveOccurredAt(occurredAtIso: string | undefined, nowMs = Date.now()): Date | null {
  const occurredAt = occurredAtIso ? new Date(occurredAtIso) : new Date(nowMs);
  if (Number.isNaN(occurredAt.getTime())) {
    return null;
  }
  if (occurredAt.getTime() > nowMs + 60_000) {
    return new Date(nowMs);
  }
  if (nowMs - occurredAt.getTime() > ANALYTICS_MAX_OCCURRED_AGE_MS) {
    return null;
  }
  return occurredAt;
}

export function parseAnalyticsIngestBody(body: unknown): ParsedAnalyticsEvent[] | null {
  const parsed = IngestBodySchema.safeParse(body);
  if (!parsed.success) {
    return null;
  }
  const events: ParsedAnalyticsEvent[] = [];
  for (const item of parsed.data.events) {
    const payload = sanitizeAnalyticsPayload(item.eventName, item.payload);
    if (!payload) {
      continue;
    }
    const occurredAt = resolveOccurredAt(item.occurredAt);
    if (!occurredAt) {
      continue;
    }
    events.push({ eventName: item.eventName, occurredAt, payload });
  }
  return events;
}
