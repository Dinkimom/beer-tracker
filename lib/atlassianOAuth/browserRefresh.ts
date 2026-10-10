import {
  getEffectiveTrackerCloudIdForBrowser,
  getEffectiveTrackerExpiresAtForBrowser,
  getEffectiveTrackerRefreshTokenForBrowser,
  readTrackerTokenPayload,
  writeTrackerTokenPayload,
} from '@/lib/trackerTokenStorage';

const REFRESH_SKEW_MS = 60_000;

let refreshInFlight: Promise<boolean> | null = null;

function shouldRefreshAccessToken(): boolean {
  const refresh = getEffectiveTrackerRefreshTokenForBrowser();
  if (!refresh) {
    return false;
  }
  const expiresAt = getEffectiveTrackerExpiresAtForBrowser();
  if (expiresAt == null) {
    return false;
  }
  return Date.now() >= expiresAt - REFRESH_SKEW_MS;
}

async function refreshAtlassianTokenOnce(): Promise<boolean> {
  const refreshToken = getEffectiveTrackerRefreshTokenForBrowser();
  if (!refreshToken) {
    return false;
  }
  const res = await fetch('/api/auth/atlassian/refresh', {
    body: JSON.stringify({ refreshToken }),
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  if (!res.ok) {
    return false;
  }
  const data = (await res.json()) as {
    accessToken?: string;
    expiresAt?: number;
    refreshToken?: string;
  };
  const accessToken = data.accessToken?.trim() ?? '';
  const nextRefresh = data.refreshToken?.trim() ?? refreshToken;
  const expiresAt =
    typeof data.expiresAt === 'number' && Number.isFinite(data.expiresAt)
      ? data.expiresAt
      : Date.now() + 3600_000;
  if (!accessToken) {
    return false;
  }
  const existing = readTrackerTokenPayload();
  writeTrackerTokenPayload({
    ...existing,
    cloudId: existing.cloudId || getEffectiveTrackerCloudIdForBrowser(),
    expiresAt,
    refreshToken: nextRefresh,
    token: accessToken,
  });
  window.dispatchEvent(
    new CustomEvent('localStorageChange', {
      detail: { key: 'beer-tracker-tracker-token' },
    })
  );
  return true;
}

/** Refresh Jira Cloud access token when near expiry or after upstream 401. */
export function ensureFreshAtlassianAccessToken(force = false): Promise<boolean> {
  if (!getEffectiveTrackerRefreshTokenForBrowser()) {
    return Promise.resolve(false);
  }
  if (!force && !shouldRefreshAccessToken()) {
    return Promise.resolve(true);
  }
  if (!refreshInFlight) {
    refreshInFlight = refreshAtlassianTokenOnce().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}
