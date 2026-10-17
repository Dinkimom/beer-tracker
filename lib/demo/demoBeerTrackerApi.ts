import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import axios from 'axios';

import { handleDemoFixtureRequest } from './demoFixtureRouter';

/**
 * Fixture-backed planner client for `/demo/planner`.
 * Never hits the network — all responses come from {@link handleDemoFixtureRequest}.
 * `baseURL` is `/api/demo` so path forks (e.g. planner-integration-rules) match production demo BFF.
 */
export const demoBeerTrackerApi = axios.create({
  baseURL: '/api/demo',
  adapter: (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const result = handleDemoFixtureRequest(config);
    return Promise.resolve({
      data: result.data,
      status: result.status,
      statusText: result.status >= 400 ? 'Error' : 'OK',
      headers: { 'content-type': 'application/json' },
      config,
      request: {},
    });
  },
});
