import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import { insertAnalyticsEvents, resetAnalyticsEventsTableEnsured } from './analyticsEventsRepository';
import { persistAnalyticsIngest, resolveAnalyticsUserId } from './analyticsIngestRouteHelpers';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  getBeerTrackerSchema: () => 'beer_tracker',
}));

describe('resolveAnalyticsUserId', () => {
  it('keeps product user UUIDs and drops on-prem anonymous', () => {
    expect(resolveAnalyticsUserId('onprem-anonymous')).toBeNull();
    expect(resolveAnalyticsUserId('7c9e6679-7425-40de-944b-e07fc1f90ae7')).toBe(
      '7c9e6679-7425-40de-944b-e07fc1f90ae7'
    );
  });
});

describe('insertAnalyticsEvents', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
    resetAnalyticsEventsTableEnsured();
  });

  it('creates the table once then inserts a batch', async () => {
    const occurredAt = new Date('2026-08-25T12:00:00.000Z');
    await insertAnalyticsEvents({
      events: [
        {
          eventName: 'page_view',
          occurredAt,
          payload: { path: '/', v: 1 },
        },
      ],
      organizationId: '11111111-1111-4111-8111-111111111111',
      userId: '22222222-2222-4222-8222-222222222222',
    });

    expect(vi.mocked(query).mock.calls[0]?.[0]).toContain('CREATE TABLE IF NOT EXISTS');
    const insertCall = vi.mocked(query).mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO analytics_events')
    );
    expect(insertCall?.[1]).toEqual([
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      'page_view',
      JSON.stringify({ path: '/', v: 1 }),
      occurredAt,
    ]);
  });
});

describe('persistAnalyticsIngest', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
    resetAnalyticsEventsTableEnsured();
  });

  it('returns 400 for an invalid body', async () => {
    const result = await persistAnalyticsIngest({
      body: { nope: true },
      organizationId: '11111111-1111-4111-8111-111111111111',
      userId: '22222222-2222-4222-8222-222222222222',
    });
    expect(result).toEqual({
      accepted: 0,
      error: 'Некорректное тело запроса',
      status: 400,
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('inserts parsed events', async () => {
    const result = await persistAnalyticsIngest({
      body: {
        events: [
          {
            eventName: 'ui_click',
            occurredAt: new Date().toISOString(),
            payload: { surface: 'header', targetId: 'theme' },
          },
        ],
      },
      organizationId: '11111111-1111-4111-8111-111111111111',
      userId: 'onprem-anonymous',
    });
    expect(result.status).toBe(200);
    expect(result.accepted).toBe(1);
    const insertCall = vi.mocked(query).mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO analytics_events')
    );
    expect(insertCall?.[1]?.[1]).toBeNull();
    expect(insertCall?.[1]?.[2]).toBe('ui_click');
  });
});
