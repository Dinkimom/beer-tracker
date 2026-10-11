import { ATLASSIAN_OAUTH_FRAGMENT_KEY } from './constants';
import { atlassianOAuthPayloadFromJson } from './fragmentPayloadClient';

export interface AtlassianOAuthFragmentPayload {
  accessToken: string;
  cloudId: string;
  expiresAt: number;
  refreshToken: string;
  /** Адрес сайта Jira Cloud (`https://acme.atlassian.net`). */
  siteUrl?: string;
}

export function encodeAtlassianOAuthFragment(payload: AtlassianOAuthFragmentPayload): string {
  const json = JSON.stringify({
    access_token: payload.accessToken,
    cloud_id: payload.cloudId,
    expires_at: payload.expiresAt,
    refresh_token: payload.refreshToken,
    site_url: payload.siteUrl || undefined,
  });
  const b64 = Buffer.from(json, 'utf8').toString('base64url');
  return `${ATLASSIAN_OAUTH_FRAGMENT_KEY}=${b64}`;
}

export function parseAtlassianOAuthFragment(
  hash: string
): AtlassianOAuthFragmentPayload | null {
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
    return atlassianOAuthPayloadFromJson(
      JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    );
  } catch {
    return null;
  }
}

/**
 * Lands on a page that persists `#atlassian_oauth` into localStorage.
 * `/auth-setup` and `/register` consume the fragment themselves; other returns
 * go through `/auth-setup?next=…` so tokens are not left unused in the hash.
 */
export function buildAtlassianOAuthSuccessRedirect(returnPath: string, fragment: string): string {
  const path = returnPath.startsWith('/') ? returnPath : '/auth-setup';
  const base = (path.split('#')[0] ?? path).trim() || '/auth-setup';
  const pathname = base.split('?')[0] ?? base;
  if (pathname === '/auth-setup' || pathname === '/register') {
    return `${base}#${fragment}`;
  }
  const next = encodeURIComponent(base);
  return `/auth-setup?next=${next}#${fragment}`;
}
