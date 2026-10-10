import {
  ATLASSIAN_ACCESSIBLE_RESOURCES_URL,
  ATLASSIAN_TOKEN_URL,
} from './constants';

interface AtlassianTokenPair {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

interface AtlassianAccessibleResource {
  id: string;
  name?: string;
  url?: string;
}

function tokenErrorMessage(data: Record<string, unknown>, status: number): string {
  if (typeof data.error_description === 'string') {
    return data.error_description;
  }
  if (typeof data.error === 'string') {
    return data.error;
  }
  return `HTTP ${status}`;
}

function parseExpiresIn(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3600;
}

function parseTokenPair(data: Record<string, unknown>): AtlassianTokenPair {
  const accessToken = typeof data.access_token === 'string' ? data.access_token.trim() : '';
  const refreshToken = typeof data.refresh_token === 'string' ? data.refresh_token.trim() : '';
  if (!accessToken || !refreshToken) {
    throw new Error('Atlassian token response missing access_token or refresh_token');
  }
  return {
    accessToken,
    expiresIn: parseExpiresIn(data.expires_in),
    refreshToken,
  };
}

function postAtlassianToken(body: Record<string, string>): Promise<AtlassianTokenPair> {
  return fetch(ATLASSIAN_TOKEN_URL, {
    body: JSON.stringify(body),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    method: 'POST',
  }).then(async (res) => {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(`Atlassian token exchange failed: ${tokenErrorMessage(data, res.status)}`);
    }
    return parseTokenPair(data);
  });
}

export function exchangeAtlassianAuthorizationCode(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<AtlassianTokenPair> {
  return postAtlassianToken({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    code: input.code,
    grant_type: 'authorization_code',
    redirect_uri: input.redirectUri,
  });
}

export function refreshAtlassianAccessToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<AtlassianTokenPair> {
  return postAtlassianToken({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: input.refreshToken,
  });
}

function mapAccessibleResource(row: unknown): AtlassianAccessibleResource | null {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id.trim() : '';
  if (!id) {
    return null;
  }
  return {
    id,
    name: typeof o.name === 'string' ? o.name : undefined,
    url: typeof o.url === 'string' ? o.url : undefined,
  };
}

export async function fetchAtlassianAccessibleResources(
  accessToken: string
): Promise<AtlassianAccessibleResource[]> {
  const res = await fetch(ATLASSIAN_ACCESSIBLE_RESOURCES_URL, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken.trim()}`,
    },
    method: 'GET',
  });
  if (!res.ok) {
    throw new Error(`Atlassian accessible-resources failed: HTTP ${res.status}`);
  }
  const data: unknown = await res.json().catch(() => []);
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map(mapAccessibleResource)
    .filter((r): r is AtlassianAccessibleResource => r != null);
}

/** Prefer first resource with a Jira scope / any site id. */
export function pickAtlassianCloudId(resources: AtlassianAccessibleResource[]): string | null {
  const first = resources[0]?.id?.trim();
  return first || null;
}
