import { describe, expect, it } from 'vitest';

import {
  parseOrgAtlassianOAuthSecret,
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

  it('keeps the previous refresh token after rotation', () => {
    const raw = serializeOrgAtlassianOAuthSecret({
      accessToken: 'access-2',
      expiresAt: 2000,
      previousRefreshToken: 'refresh-1',
      refreshToken: 'refresh-2',
    });
    expect(parseOrgAtlassianOAuthSecret(raw)).toEqual({
      accessToken: 'access-2',
      expiresAt: 2000,
      previousRefreshToken: 'refresh-1',
      refreshToken: 'refresh-2',
    });
  });

  it('is not an OAuth pair without a refresh token', () => {
    expect(parseOrgAtlassianOAuthSecret('api-token')).toBeNull();
    expect(parseOrgAtlassianOAuthSecret(JSON.stringify({ accessToken: 'a' }))).toBeNull();
  });
});
