/**
 * Настроенные экземпляры axios для разных API
 * Централизованная конфигурация клиентов HTTP
 */

import axios from 'axios';

import { TRACKER_EMAIL_HEADER } from './issueTrackerProvider/jiraBasicAuthEmail';
import { getBrowserRealtimeClientId } from './realtime/sprintRealtimeClientId';
import { REALTIME_CLIENT_ID_HEADER } from './realtime/sprintRealtimeConstants';
import { parseRegistryUuidString } from './registryUuidString';
import {
  PRODUCT_ACTIVE_ORGANIZATION_ID_STORAGE_KEY,
  TENANT_ORG_HEADER,
} from './tenantHttpConstants';
import {
  getEffectiveTrackerEmailForBrowser,
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

  const trackerEmail = getEffectiveTrackerEmailForBrowser();
  if (trackerEmail) {
    config.headers[TRACKER_EMAIL_HEADER] = trackerEmail;
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
  if (isAuthPage) {
    return;
  }
  const next = encodeURIComponent(`${pathname}${search}`);
  const target = `/auth-setup?next=${next}`;
  window.location.assign(target);
}

beerTrackerApi.interceptors.request.use(
  (config) => {
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      config.headers.delete('Content-Type');
    }
    if (typeof window !== 'undefined') {
      try {
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

beerTrackerApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status as number | undefined;
    if (status === 401 && typeof window !== 'undefined') {
      redirectBeerTrackerApiUnauthorized();
    }
    return Promise.reject(error);
  }
);
