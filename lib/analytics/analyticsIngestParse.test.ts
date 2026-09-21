import { describe, expect, it } from 'vitest';

import { ANALYTICS_EVENT, shouldSkipAnalyticsPath } from './analyticsEventNames';
import {
  parseAnalyticsIngestBody,
  resolveOccurredAt,
  sanitizeAnalyticsPayload,
  sanitizeClientSettingsPayload,
} from './analyticsIngestParse';
import { CLIENT_SETTINGS_PAYLOAD_VERSION } from './clientSettingsAllowlist';

describe('shouldSkipAnalyticsPath', () => {
  it('skips auth and demo routes', () => {
    expect(shouldSkipAnalyticsPath('/login')).toBe(true);
    expect(shouldSkipAnalyticsPath('/register')).toBe(true);
    expect(shouldSkipAnalyticsPath('/auth-setup')).toBe(true);
    expect(shouldSkipAnalyticsPath('/demo/planner')).toBe(true);
    expect(shouldSkipAnalyticsPath('/')).toBe(false);
    expect(shouldSkipAnalyticsPath('/admin')).toBe(false);
  });
});

describe('sanitizeClientSettingsPayload', () => {
  it('keeps allowlisted keys and drops secrets', () => {
    const sanitized = sanitizeClientSettingsPayload({
      boardViewMode: 'kanban',
      token: 'secret',
      v: 1,
    });
    expect(sanitized).toEqual({ boardViewMode: 'kanban', v: 1 });
  });
});

describe('sanitizeAnalyticsPayload', () => {
  it('keeps path and search for page_view', () => {
    expect(
      sanitizeAnalyticsPayload(ANALYTICS_EVENT.pageView, {
        path: '/admin',
        search: '?tab=sync',
        token: 'nope',
      })
    ).toEqual({ path: '/admin', search: '?tab=sync', v: 1 });
  });

  it('drops tracker token and CalDAV url/password from ui_click payloads', () => {
    expect(
      sanitizeAnalyticsPayload(ANALYTICS_EVENT.uiClick, {
        appPassword: 'mail-app-password-value',
        caldavUrl: 'https://calendar.mail.ru/principals/mail.ru/user/calendars/id/',
        surface: 'calendar',
        targetId: 'save',
        token: 'y0_AgAAAAAsecretTokenValue',
      })
    ).toEqual({
      surface: 'calendar',
      targetId: 'save',
    });
  });
});

describe('resolveOccurredAt', () => {
  const now = Date.parse('2026-08-25T12:00:00.000Z');

  it('defaults to now and drops stale timestamps', () => {
    expect(resolveOccurredAt(undefined, now)?.toISOString()).toBe('2026-08-25T12:00:00.000Z');
    expect(resolveOccurredAt('2026-01-01T00:00:00.000Z', now)).toBeNull();
  });

  it('clamps dates slightly in the future', () => {
    const clamped = resolveOccurredAt('2026-08-25T12:05:00.000Z', now);
    expect(clamped?.toISOString()).toBe('2026-08-25T12:00:00.000Z');
  });
});

describe('parseAnalyticsIngestBody', () => {
  it('rejects unknown event names', () => {
    expect(
      parseAnalyticsIngestBody({
        events: [{ eventName: 'not_a_real_event', payload: {} }],
      })
    ).toBeNull();
  });

  it('parses a client_settings batch', () => {
    const parsed = parseAnalyticsIngestBody({
      events: [
        {
          eventName: 'client_settings',
          occurredAt: new Date().toISOString(),
          payload: { boardViewMode: 'occupancy', experimentalFeatures: true },
        },
      ],
    });
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0]?.eventName).toBe('client_settings');
    expect(parsed?.[0]?.payload).toMatchObject({
      boardViewMode: 'occupancy',
      experimentalFeatures: true,
      v: CLIENT_SETTINGS_PAYLOAD_VERSION,
    });
  });
});
