/**
 * Единая фабрика Axios для Yandex Tracker (интерцепторы, ретраи 429).
 * Серверные маршруты должны использовать инстанс из getTrackerApiFromRequest —
 * не дефолтный trackerApi из axios.ts (у него намеренно пустой OAuth).
 */

import type { AxiosAdapter, AxiosInstance } from 'axios';

import axios from 'axios';

import {
  handleTracker429Retry,
  handleTrackerGatewayRetry,
} from './trackerAxiosRetryHelpers';

interface TrackerAxiosCreateConfig {
  /** Кастомный транспорт (например в тестах), иначе стандартный HTTP-адаптер Axios */
  adapter?: AxiosAdapter;
  apiUrl?: string;
  oauthToken: string;
  orgId: string;
}

function attachTrackerInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use(
    (config) => config,
    (error) => {
      console.error('[Tracker Request Error]', error);
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 429) {
        const retried = await handleTracker429Retry(instance, error);
        if (retried != null) {
          return retried;
        }
      }

      const gatewayRetried = await handleTrackerGatewayRetry(instance, error);
      if (gatewayRetried != null) {
        return gatewayRetried;
      }

      console.error('[Tracker Response Error]', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
        data: error.response?.data,
      });
      return Promise.reject(error);
    }
  );
}

/**
 * Создаёт AxiosInstance для Tracker API с общими интерцепторами (в т.ч. 429).
 */
export function createTrackerAxiosInstance(config: TrackerAxiosCreateConfig): AxiosInstance {
  const instance = axios.create({
    ...(config.adapter != null ? { adapter: config.adapter } : {}),
    baseURL: config.apiUrl || 'https://api.tracker.yandex.net/v2',
    headers: {
      'Authorization': `OAuth ${config.oauthToken}`,
      'X-Org-ID': config.orgId,
      'Content-Type': 'application/json',
    },
  });
  attachTrackerInterceptors(instance);
  return instance;
}

/**
 * lib/trackerApi/* принимает опциональный AxiosInstance; без него нельзя звать трекер
 * (дефолтный server trackerApi с пустым OAuth ломает запросы).
 */
export function requireTrackerAxiosForApiRoute(client: AxiosInstance | undefined): AxiosInstance {
  if (client == null) {
    throw new Error(
      'Yandex Tracker API requires an AxiosInstance from getTrackerApiFromRequest(request). ' +
        'The default server trackerApi has no user OAuth token (by design).'
    );
  }
  return client;
}
