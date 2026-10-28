import { describe, expect, it } from 'vitest';

import { TRACKER_OAUTH_LOCAL_STORAGE_KEY } from '@/lib/trackerTokenStorage';

import {
  ANALYTICS_FORBIDDEN_STORAGE_KEYS,
  redactSecretPatternsInString,
  stripForbiddenAnalyticsKeys,
} from './analyticsSecretRedaction';
import { CLIENT_SETTINGS_FIELDS } from './clientSettingsAllowlist';

describe('analytics secret redaction', () => {
  it('does not include the tracker token storage key in the settings allowlist', () => {
    const allowlisted = new Set<string>(Object.values(CLIENT_SETTINGS_FIELDS));
    expect(allowlisted.has(TRACKER_OAUTH_LOCAL_STORAGE_KEY)).toBe(false);
    expect(ANALYTICS_FORBIDDEN_STORAGE_KEYS).toEqual([TRACKER_OAUTH_LOCAL_STORAGE_KEY]);
  });

  it('drops password and token keys, including nested', () => {
    expect(
      stripForbiddenAnalyticsKeys({
        appPassword: 'mail-app-password',
        token: 'y0_AgAAAAAsecretTokenValue',
        surface: 'settings',
        nested: {
          token: 'y0_AgAAAAAanotherToken',
          targetId: 'save',
        },
      })
    ).toEqual({
      nested: { targetId: 'save' },
      surface: 'settings',
    });
  });

  it('masks a YTracker token inside arbitrary strings', () => {
    expect(redactSecretPatternsInString('token=y0_AgAAAAAsecretTokenValue rest')).toBe(
      'token=[redacted] rest'
    );
  });
});
