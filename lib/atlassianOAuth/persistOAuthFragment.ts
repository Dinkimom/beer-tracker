import { PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY } from '@/lib/tenantHttpConstants';
import {
  TRACKER_OAUTH_LOCAL_STORAGE_KEY,
  readTrackerTokenPayload,
  writeTrackerTokenPayload,
} from '@/lib/trackerTokenStorage';

import { consumeAtlassianOAuthFragmentFromLocation } from './applyOAuthFragment';

function readActiveOrganizationId(): string {
  try {
    return localStorage.getItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

/**
 * Consumes `#atlassian_oauth=…` on any page and persists tokens to localStorage.
 * Needed when OAuth `return` is not `/auth-setup` / `/register`.
 */
export function persistAtlassianOAuthFragmentFromLocation(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const tokens = consumeAtlassianOAuthFragmentFromLocation();
  if (!tokens) {
    return false;
  }
  const existing = readTrackerTokenPayload();
  const organizationId = existing.organizationId.trim() || readActiveOrganizationId();
  writeTrackerTokenPayload({
    cloudId: tokens.cloudId,
    expiresAt: tokens.expiresAt,
    organizationId,
    refreshToken: tokens.refreshToken,
    token: tokens.accessToken,
  });
  window.dispatchEvent(
    new CustomEvent('localStorageChange', {
      detail: { key: TRACKER_OAUTH_LOCAL_STORAGE_KEY },
    })
  );
  return true;
}
