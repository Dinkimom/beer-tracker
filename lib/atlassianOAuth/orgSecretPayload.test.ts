import { describe, expect, it } from 'vitest';

import {
  parseOrgTrackerSecretPayload,
  serializeOrgAtlassianOAuthSecret,
} from './orgSecretPayload';

describe('orgSecretPayload', () => {
  it('round-trips OAuth JSON secret', () => {
    const raw = serializeOrgAtlassianOAuthSecret({
      accessToken: 'access',
      expiresAt: 1000,
      refreshToken: 'refresh',
    });
    expect(parseOrgTrackerSecretPayload(raw)).toEqual({
      accessToken: 'access',
      expiresAt: 1000,
      refreshToken: 'refresh',
    });
  });

  it('treats bare token as legacy access token', () => {
    expect(parseOrgTrackerSecretPayload('pat-legacy')).toEqual({ accessToken: 'pat-legacy' });
  });
});
