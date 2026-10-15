import { describe, expect, it } from 'vitest';

import { clientAllowsRedirectUri, redirectUriMatches } from './redirectUri';

describe('redirectUriMatches', () => {
  it('matches exact non-loopback URIs', () => {
    expect(
      redirectUriMatches('https://cursor.com/callback', 'https://cursor.com/callback')
    ).toBe(true);
    expect(
      redirectUriMatches('https://cursor.com/callback', 'https://cursor.com/other')
    ).toBe(false);
  });

  it('allows any port on loopback', () => {
    expect(
      redirectUriMatches('http://127.0.0.1:54321/callback', 'http://127.0.0.1/callback')
    ).toBe(true);
    expect(
      redirectUriMatches('http://localhost:9999/cb', 'http://localhost:1/cb')
    ).toBe(true);
  });

  it('requires matching path on loopback', () => {
    expect(
      redirectUriMatches('http://127.0.0.1:1/a', 'http://127.0.0.1:1/b')
    ).toBe(false);
  });
});

describe('clientAllowsRedirectUri', () => {
  it('returns true when any registered URI matches', () => {
    expect(
      clientAllowsRedirectUri(
        ['https://a.example/cb', 'http://127.0.0.1/cb'],
        'http://127.0.0.1:4000/cb'
      )
    ).toBe(true);
  });
});
