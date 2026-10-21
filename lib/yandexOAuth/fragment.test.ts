import { describe, expect, it } from 'vitest';

import {
  buildYandexOAuthSuccessRedirect,
  parseYandexOAuthErrorSearch,
  parseYandexOAuthHash,
} from './fragment';

describe('buildYandexOAuthSuccessRedirect', () => {
  it('returns to pages that consume the fragment directly', () => {
    expect(buildYandexOAuthSuccessRedirect('/register?next=%2Fadmin', 'y0_abc')).toBe(
      '/register?next=%2Fadmin#yandex_oauth=y0_abc'
    );
    expect(buildYandexOAuthSuccessRedirect('/auth-setup?next=%2Fsprint', 'y0_abc')).toBe(
      '/auth-setup?next=%2Fsprint#yandex_oauth=y0_abc'
    );
  });

  it('routes other pages through auth-setup with next', () => {
    expect(buildYandexOAuthSuccessRedirect('/sprint?id=1', 'y0_abc')).toBe(
      '/auth-setup?next=%2Fsprint%3Fid%3D1#yandex_oauth=y0_abc'
    );
  });

  it('round-trips the token through the hash parser', () => {
    const target = buildYandexOAuthSuccessRedirect('/auth-setup', 'y0_a+b/c=');
    expect(parseYandexOAuthHash(target.slice(target.indexOf('#')))).toBe('y0_a+b/c=');
  });
});

describe('parseYandexOAuth*', () => {
  it('returns empty strings when nothing is present', () => {
    expect(parseYandexOAuthHash('')).toBe('');
    expect(parseYandexOAuthHash('#atlassian_oauth=x')).toBe('');
    expect(parseYandexOAuthErrorSearch('?next=%2F')).toBe('');
  });

  it('reads the callback error message', () => {
    expect(parseYandexOAuthErrorSearch('?yandex_oauth_error=access_denied')).toBe('access_denied');
  });
});
