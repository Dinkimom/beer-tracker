/**
 * Org tracker secret may be a legacy bare access token or JSON with refresh for Jira Cloud OAuth.
 */

export interface OrgAtlassianOAuthSecret {
  accessToken: string;
  expiresAt?: number;
  /**
   * Refresh token before the last server-side rotation. The browser that shares this grant
   * (on-prem registration) still holds it and must receive the current pair instead of a new refresh.
   */
  previousRefreshToken?: string;
  refreshToken: string;
}

interface OrgTrackerSecretPayload {
  accessToken: string;
  expiresAt?: number;
  previousRefreshToken?: string;
  refreshToken?: string;
}

export function serializeOrgAtlassianOAuthSecret(secret: OrgAtlassianOAuthSecret): string {
  const previousRefreshToken = secret.previousRefreshToken?.trim();
  return JSON.stringify({
    accessToken: secret.accessToken.trim(),
    expiresAt: secret.expiresAt,
    ...(previousRefreshToken ? { previousRefreshToken } : {}),
    refreshToken: secret.refreshToken.trim(),
    v: 1,
  });
}

function optionalTrimmed(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function parseOrgTrackerSecretPayload(raw: string): OrgTrackerSecretPayload {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { accessToken: '' };
  }
  if (!trimmed.startsWith('{')) {
    return { accessToken: trimmed };
  }
  try {
    const data = JSON.parse(trimmed) as Record<string, unknown>;
    const accessToken = optionalTrimmed(data.accessToken);
    if (!accessToken) {
      return { accessToken: trimmed };
    }
    const expiresAt =
      typeof data.expiresAt === 'number' && Number.isFinite(data.expiresAt)
        ? data.expiresAt
        : undefined;
    return {
      accessToken,
      expiresAt,
      previousRefreshToken: optionalTrimmed(data.previousRefreshToken),
      refreshToken: optionalTrimmed(data.refreshToken),
    };
  } catch {
    return { accessToken: trimmed };
  }
}

/** OAuth pair with a refresh token; `null` for bare tokens (API token, legacy access token). */
export function parseOrgAtlassianOAuthSecret(raw: string): OrgAtlassianOAuthSecret | null {
  const payload = parseOrgTrackerSecretPayload(raw);
  if (!payload.accessToken || !payload.refreshToken) {
    return null;
  }
  return { ...payload, refreshToken: payload.refreshToken };
}
