/**
 * Org tracker secret may be a legacy bare access token or JSON with refresh for Jira Cloud OAuth.
 */

interface OrgAtlassianOAuthSecret {
  accessToken: string;
  expiresAt?: number;
  refreshToken: string;
}

export function serializeOrgAtlassianOAuthSecret(secret: OrgAtlassianOAuthSecret): string {
  return JSON.stringify({
    accessToken: secret.accessToken.trim(),
    expiresAt: secret.expiresAt,
    refreshToken: secret.refreshToken.trim(),
    v: 1,
  });
}

export function parseOrgTrackerSecretPayload(raw: string): {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { accessToken: '' };
  }
  if (!trimmed.startsWith('{')) {
    return { accessToken: trimmed };
  }
  try {
    const data = JSON.parse(trimmed) as Record<string, unknown>;
    const accessToken =
      typeof data.accessToken === 'string' ? data.accessToken.trim() : '';
    const refreshToken =
      typeof data.refreshToken === 'string' ? data.refreshToken.trim() : undefined;
    const expiresAt =
      typeof data.expiresAt === 'number' && Number.isFinite(data.expiresAt)
        ? data.expiresAt
        : undefined;
    if (!accessToken) {
      return { accessToken: trimmed };
    }
    return { accessToken, expiresAt, refreshToken };
  } catch {
    return { accessToken: trimmed };
  }
}
