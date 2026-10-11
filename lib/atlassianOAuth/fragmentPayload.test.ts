import { describe, expect, it } from 'vitest';

import {
  buildAtlassianOAuthSuccessRedirect,
  encodeAtlassianOAuthFragment,
  parseAtlassianOAuthFragment,
} from './fragmentPayload';

describe('atlassian OAuth fragment', () => {
  it('encodes and parses token payload', () => {
    const fragment = encodeAtlassianOAuthFragment({
      accessToken: 'a1',
      cloudId: 'c1',
      expiresAt: 42,
      refreshToken: 'r1',
    });
    expect(parseAtlassianOAuthFragment(`#${fragment}`)).toEqual({
      accessToken: 'a1',
      cloudId: 'c1',
      expiresAt: 42,
      refreshToken: 'r1',
    });
  });

  it('round-trips the Jira Cloud site address', () => {
    const fragment = encodeAtlassianOAuthFragment({
      accessToken: 'a1',
      cloudId: 'c1',
      expiresAt: 42,
      refreshToken: 'r1',
      siteUrl: 'https://acme.atlassian.net',
    });
    expect(parseAtlassianOAuthFragment(`#${fragment}`)?.siteUrl).toBe('https://acme.atlassian.net');
  });

  it('keeps auth-setup and register returns; wraps other paths with next', () => {
    const fragment = 'atlassian_oauth=abc';
    expect(buildAtlassianOAuthSuccessRedirect('/auth-setup', fragment)).toBe(
      `/auth-setup#${fragment}`
    );
    expect(buildAtlassianOAuthSuccessRedirect('/register?next=/admin', fragment)).toBe(
      `/register?next=/admin#${fragment}`
    );
    expect(buildAtlassianOAuthSuccessRedirect('/planner/113/sprint/1', fragment)).toBe(
      `/auth-setup?next=${encodeURIComponent('/planner/113/sprint/1')}#${fragment}`
    );
  });
});
