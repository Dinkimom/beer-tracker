import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import axios from 'axios';

import { handleDemoFixtureRequest } from './demoFixtureRouter';

/**
 * Мутации, которые в жизни ждут трекер: в демо отвечаем с задержкой,
 * чтобы было видно состояние «в процессе» на карточке.
 */
const DEMO_TRACKER_MUTATION_LATENCY_MS = 700;

function demoResponseLatencyMs(config: InternalAxiosRequestConfig): number {
  const method = (config.method ?? 'get').toLowerCase();
  const url = config.url ?? '';
  const isTrackerMutation =
    (method === 'patch' && /\/issues\/[^/]+\/status$/.test(url)) ||
    (method !== 'get' && /\/issues\/[^/?]+\/sprint(\?|$)/.test(url));
  return isTrackerMutation ? DEMO_TRACKER_MUTATION_LATENCY_MS : 0;
}

/**
 * Fixture-backed planner client for `/demo/planner`.
 * Never hits the network — all responses come from {@link handleDemoFixtureRequest}.
 * `baseURL` is `/api/demo` so path forks (e.g. planner-integration-rules) match production demo BFF.
 */
export const demoBeerTrackerApi = axios.create({
  baseURL: '/api/demo',
  adapter: async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const latency = demoResponseLatencyMs(config);
    if (latency > 0) {
      await new Promise((resolve) => globalThis.setTimeout(resolve, latency));
    }
    const result = handleDemoFixtureRequest(config);
    return {
      data: result.data,
      status: result.status,
      statusText: result.status >= 400 ? 'Error' : 'OK',
      headers: { 'content-type': 'application/json' },
      config,
      request: {},
    };
  },
});
