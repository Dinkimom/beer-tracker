/**
 * Настроенные экземпляры axios для разных API
 * Централизованная конфигурация клиентов HTTP
 */

import axios from 'axios';

import { ensureFreshAtlassianAccessToken } from './atlassianOAuth/browserRefresh';
import { TRACKER_CLOUD_ID_HEADER } from './atlassianOAuth/constants';
import { getBrowserRealtimeClientId } from './realtime/sprintRealtimeClientId';
import { REALTIME_CLIENT_ID_HEADER } from './realtime/sprintRealtimeConstants';
import { parseRegistryUuidString } from './registryUuidString';
import {
  PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY,
  TENANT_ORG_HEADER,
} from './tenantHttpConstants';
import {
  getEffectiveTrackerCloudIdForBrowser,
  getEffectiveTrackerRefreshTokenForBrowser,
  getEffectiveTrackerTokenForBrowser,
} from './trackerTokenStorage';

/**
 * Axios инстанс для внутреннего Beer Tracker API
 * Используется в клиентских компонентах для обращения к Next.js API routes
 */
export const beerTrackerApi = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

function applyBeerTrackerBrowserRequestHeaders(config: Parameters<
  NonNullable<Parameters<typeof beerTrackerApi.interceptors.request.use>[0]>
>[0]): void {
  const trackerToken = getEffectiveTrackerTokenForBrowser();
  if (trackerToken) {
    config.headers['X-Tracker-Token'] = trackerToken;
  }

  const cloudId = getEffectiveTrackerCloudIdForBrowser();
  if (cloudId) {
    config.headers[TRACKER_CLOUD_ID_HEADER] = cloudId;
  }

  const orgId = parseRegistryUuidString(
    localStorage.getItem(PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY)
  );
  if (orgId) {
    config.headers[TENANT_ORG_HEADER] = orgId;
  }

  const realtimeClientId = getBrowserRealtimeClientId();
  if (realtimeClientId) {
    config.headers[REALTIME_CLIENT_ID_HEADER] = realtimeClientId;
  }
}

function redirectBeerTrackerApiUnauthorized(): void {
  const { pathname, search } = window.location;
  const isAuthPage =
    pathname === '/login' || pathname === '/register' || pathname === '/auth-setup';
  // Демо-планер работает без входа: 401 случайного запроса не уводит его на настройку.
  if (isAuthPage || pathname.startsWith('/demo')) {
    return;
  }
  const next = encodeURIComponent(`${pathname}${search}`);
  const target = `/auth-setup?next=${next}`;
  window.location.assign(target);
}

beerTrackerApi.interceptors.request.use(
  async (config) => {
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      config.headers.delete('Content-Type');
    }
    if (typeof window !== 'undefined') {
      try {
        if (getEffectiveTrackerRefreshTokenForBrowser()) {
          await ensureFreshAtlassianAccessToken(false);
        }
        applyBeerTrackerBrowserRequestHeaders(config);
      } catch (error) {
        console.error('[beerTrackerApi] Error reading token from localStorage:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 401 трекера (`code: 'unauthorized'` из `handleApiError`) на повторе после успешного refresh:
 * токен пользователя свежий, значит отказ апстрима (scope, токен организации), а не конец сессии.
 */
function isTrackerRejectionAfterRefresh(
  error: { response?: { data?: unknown } },
  config: { _atlassianRetry?: boolean } | undefined
): boolean {
  const data = error.response?.data as { code?: unknown } | undefined;
  return Boolean(config?._atlassianRetry) && data?.code === 'unauthorized';
}

beerTrackerApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status as number | undefined;
    const config = error?.config as
      | (typeof error.config & { _atlassianRetry?: boolean })
      | undefined;
    if (
      status === 401 &&
      typeof window !== 'undefined' &&
      config &&
      !config._atlassianRetry &&
      getEffectiveTrackerRefreshTokenForBrowser()
    ) {
      const refreshed = await ensureFreshAtlassianAccessToken(true);
      if (refreshed) {
        config._atlassianRetry = true;
        applyBeerTrackerBrowserRequestHeaders(config);
        return beerTrackerApi.request(config);
      }
    }
    if (
      status === 401 &&
      typeof window !== 'undefined' &&
      !isTrackerRejectionAfterRefresh(error, config)
    ) {
      redirectBeerTrackerApiUnauthorized();
    }
    return Promise.reject(error);
  }
);
