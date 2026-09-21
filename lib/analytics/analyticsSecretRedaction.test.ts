import { describe, expect, it } from 'vitest';

import { DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY } from '@/lib/calendar/developerCalDavCredentialsStorage';
import { TRACKER_OAUTH_LOCAL_STORAGE_KEY } from '@/lib/trackerTokenStorage';

import {
  ANALYTICS_FORBIDDEN_STORAGE_KEYS,
  redactSecretPatternsInString,
  stripForbiddenAnalyticsKeys,
} from './analyticsSecretRedaction';
import { CLIENT_SETTINGS_FIELDS } from './clientSettingsAllowlist';

describe('analytics secret redaction', () => {
  it('does not include CalDAV or tracker token storage keys in the settings allowlist', () => {
    const allowlisted = new Set<string>(Object.values(CLIENT_SETTINGS_FIELDS));
    expect(allowlisted.has(DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY)).toBe(false);
    expect(allowlisted.has(TRACKER_OAUTH_LOCAL_STORAGE_KEY)).toBe(false);
    expect(ANALYTICS_FORBIDDEN_STORAGE_KEYS).toEqual(
      expect.arrayContaining([
        DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY,
        TRACKER_OAUTH_LOCAL_STORAGE_KEY,
      ])
    );
  });

  it('drops CalDAV URL/password and tracker token keys, including nested', () => {
    expect(
      stripForbiddenAnalyticsKeys({
        caldavUrl: 'https://calendar.mail.ru/principals/mail.ru/user/calendars/id/',
        appPassword: 'mail-app-password',
        token: 'y0_AgAAAAAsecretTokenValue',
        surface: 'settings',
        nested: {
          calDavUrl: 'https://calendar.mail.ru/principals/x/y/calendars/z/',
          token: 'y0_AgAAAAAanotherToken',
          targetId: 'calendar-busy',
        },
      })
    ).toEqual({
      nested: { targetId: 'calendar-busy' },
      surface: 'settings',
    });
  });

  it('masks YTracker token and CalDAV URL inside arbitrary strings', () => {
    expect(
      redactSecretPatternsInString(
        'token=y0_AgAAAAAsecretTokenValue url=https://calendar.mail.ru/principals/mail.ru/u/calendars/id/'
      )
    ).toBe('token=[redacted] url=[redacted]');
  });
});
