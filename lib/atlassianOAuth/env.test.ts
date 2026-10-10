import { afterEach, describe, expect, it } from 'vitest';

import { assertAtlassianOAuthConfigured } from './env';

const ORIGINAL_ID = process.env.ATLASSIAN_OAUTH_CLIENT_ID;
const ORIGINAL_SECRET = process.env.ATLASSIAN_OAUTH_CLIENT_SECRET;

afterEach(() => {
  if (ORIGINAL_ID === undefined) {
    delete process.env.ATLASSIAN_OAUTH_CLIENT_ID;
  } else {
    process.env.ATLASSIAN_OAUTH_CLIENT_ID = ORIGINAL_ID;
  }
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.ATLASSIAN_OAUTH_CLIENT_SECRET;
  } else {
    process.env.ATLASSIAN_OAUTH_CLIENT_SECRET = ORIGINAL_SECRET;
  }
});

describe('assertAtlassianOAuthConfigured', () => {
  it('fails when either credential is missing', () => {
    delete process.env.ATLASSIAN_OAUTH_CLIENT_ID;
    delete process.env.ATLASSIAN_OAUTH_CLIENT_SECRET;
    const result = assertAtlassianOAuthConfigured();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('ATLASSIAN_OAUTH_CLIENT_ID');
    }
  });

  it('returns credentials when both are set', () => {
    process.env.ATLASSIAN_OAUTH_CLIENT_ID = ' client-id ';
    process.env.ATLASSIAN_OAUTH_CLIENT_SECRET = ' secret ';
    expect(assertAtlassianOAuthConfigured()).toEqual({
      clientId: 'client-id',
      clientSecret: 'secret',
      ok: true,
    });
  });
});
