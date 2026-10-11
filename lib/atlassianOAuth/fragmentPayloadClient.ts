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

function trimmedString(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

/** Поля `#atlassian_oauth` из декодированного JSON; `null`, если токенов нет. */
export function atlassianOAuthPayloadFromJson(raw: unknown): AtlassianOAuthFragmentPayload | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const data = raw as Record<string, unknown>;
  const accessToken = trimmedString(data.access_token);
  const refreshToken = trimmedString(data.refresh_token);
  const cloudId = trimmedString(data.cloud_id);
  const expiresAt =
    typeof data.expires_at === 'number'
      ? data.expires_at
      : Number.parseInt(String(data.expires_at ?? ''), 10);
  if (!accessToken || !refreshToken || !cloudId || !Number.isFinite(expiresAt)) {
    return null;
  }
  const siteUrl = trimmedString(data.site_url);
  return { accessToken, cloudId, expiresAt, refreshToken, ...(siteUrl ? { siteUrl } : {}) };
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
    return atlassianOAuthPayloadFromJson(JSON.parse(base64UrlToUtf8(encoded)));
  } catch {
    return null;
  }
}
