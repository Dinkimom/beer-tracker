import { describe, expect, it } from 'vitest';

import { buildAtlassianAuthorizeUrl } from './authorizeUrl';
import { ATLASSIAN_OAUTH_SCOPES } from './constants';

describe('buildAtlassianAuthorizeUrl', () => {
  it('builds authorize URL with classic scopes and consent', () => {
    const url = new URL(
      buildAtlassianAuthorizeUrl({
        clientId: 'client-1',
        redirectUri: 'https://app.example/api/auth/atlassian/callback',
        state: 'state-xyz',
      })
    );
    expect(url.origin + url.pathname).toBe('https://auth.atlassian.com/authorize');
    expect(url.searchParams.get('client_id')).toBe('client-1');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('audience')).toBe('api.atlassian.com');
    expect(url.searchParams.get('state')).toBe('state-xyz');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://app.example/api/auth/atlassian/callback'
    );
    for (const scope of ATLASSIAN_OAUTH_SCOPES) {
      expect(url.searchParams.get('scope')).toContain(scope);
    }
  });
});
