import { parseAtlassianOAuthHash } from './fragmentPayloadClient';

export interface AppliedAtlassianOAuthTokens {
  accessToken: string;
  cloudId: string;
  expiresAt: number;
  refreshToken: string;
}

function tokensFromHash(hash: string): AppliedAtlassianOAuthTokens | null {
  const payload = parseAtlassianOAuthHash(hash);
  if (!payload) {
    return null;
  }
  return {
    accessToken: payload.accessToken,
    cloudId: payload.cloudId,
    expiresAt: payload.expiresAt,
    refreshToken: payload.refreshToken,
  };
}

/** Read `#atlassian_oauth=…` without mutating history (safe during render). */
export function peekAtlassianOAuthFragmentFromLocation(): AppliedAtlassianOAuthTokens | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return tokensFromHash(window.location.hash);
}

/** Strip OAuth fragment from the URL after tokens were read (call from useEffect). */
export function clearAtlassianOAuthFragmentFromLocation(): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (!parseAtlassianOAuthHash(window.location.hash)) {
    return;
  }
  const url = new URL(window.location.href);
  url.hash = '';
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}

/**
 * Reads `#atlassian_oauth=…` from the current location, clears the hash, returns tokens.
 * Must not run during React render — use peek + clear, or call from useEffect.
 */
export function consumeAtlassianOAuthFragmentFromLocation(): AppliedAtlassianOAuthTokens | null {
  const tokens = peekAtlassianOAuthFragmentFromLocation();
  if (!tokens) {
    return null;
  }
  clearAtlassianOAuthFragmentFromLocation();
  return tokens;
}

/** Read `atlassian_oauth_error` without mutating history (safe during render). */
export function peekAtlassianOAuthErrorFromSearch(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return new URLSearchParams(window.location.search).get('atlassian_oauth_error')?.trim() ?? '';
}

/** Remove `atlassian_oauth_error` from the query string (call from useEffect). */
export function clearAtlassianOAuthErrorFromSearch(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  if (!params.has('atlassian_oauth_error')) {
    return;
  }
  params.delete('atlassian_oauth_error');
  const qs = params.toString();
  const path = window.location.pathname;
  const search = qs ? `?${qs}` : '';
  const hash = window.location.hash;
  window.history.replaceState(null, '', path + search + hash);
}
