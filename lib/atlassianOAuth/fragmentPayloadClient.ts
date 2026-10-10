import type { AtlassianOAuthFragmentPayload } from './fragmentPayload';

import { ATLASSIAN_OAUTH_FRAGMENT_KEY } from './constants';

function base64UrlToUtf8(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const withPad = padded + '='.repeat(padLen);
  if (typeof atob === 'function') {
    const binary = atob(withPad);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(encoded, 'base64url').toString('utf8');
}

/** Client-side parse of `#atlassian_oauth=…` after OAuth redirect. */
export function parseAtlassianOAuthHash(hash: string): AtlassianOAuthFragmentPayload | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) {
    return null;
  }
  const params = new URLSearchParams(raw);
  const encoded = params.get(ATLASSIAN_OAUTH_FRAGMENT_KEY)?.trim();
  if (!encoded) {
    return null;
  }
  try {
    const data = JSON.parse(base64UrlToUtf8(encoded)) as Record<string, unknown>;
    const accessToken =
      typeof data.access_token === 'string' ? data.access_token.trim() : '';
    const refreshToken =
      typeof data.refresh_token === 'string' ? data.refresh_token.trim() : '';
    const cloudId = typeof data.cloud_id === 'string' ? data.cloud_id.trim() : '';
    const expiresAt =
      typeof data.expires_at === 'number' && Number.isFinite(data.expires_at)
        ? data.expires_at
        : Number.parseInt(String(data.expires_at ?? ''), 10);
    if (!accessToken || !refreshToken || !cloudId || !Number.isFinite(expiresAt)) {
      return null;
    }
    return { accessToken, cloudId, expiresAt, refreshToken };
  } catch {
    return null;
  }
}
