import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OTORVA_DEFAULT_API_URL } from '@/lib/issueTrackerProvider/otorvaApi';

import { exchangeOtorvaCredentials } from './otorvaCredentials';

const setupState = vi.hoisted(() => ({ initialized: false }));

vi.mock('@/lib/onPrem/setupState', () => ({
  readOnPremSetupState: () => Promise.resolve({ hasAdmins: setupState.initialized, hasOrganizations: setupState.initialized, initialized: setupState.initialized }),
}));
vi.mock('@/lib/organizations/organizationRepository', () => ({
  fetchFirstOrganizationId: () => Promise.resolve(null),
  findOrganizationById: () => Promise.resolve(null),
}));

let otorvaInitialized = false;
let loginStatus = 200;
let requests: InternalAxiosRequestConfig[] = [];

const adapter: AxiosAdapter = (config) => {
  requests.push(config);
  const respond = (status: number, data: unknown) => {
    const response = { config, data, headers: {}, status, statusText: '' } as AxiosResponse;
    return status >= 400
      ? Promise.reject(new axios.AxiosError('error', 'ERR_BAD_REQUEST', config, null, response))
      : Promise.resolve(response);
  };
  if (config.url === '/auth/setup-state') return respond(200, { bootstrap_enabled: true, initialized: otorvaInitialized });
  if (config.url === '/auth/bootstrap') return respond(201, { token: 'jwt-bootstrap' });
  if (config.url === '/auth/login') return respond(loginStatus, loginStatus === 200 ? { token: 'jwt-login' } : { error: 'x' });
  return respond(404, {});
};

const body = (config: InternalAxiosRequestConfig) => JSON.parse(config.data as string) as Record<string, unknown>;

describe('exchangeOtorvaCredentials', () => {
  beforeEach(() => {
    requests = [];
    otorvaInitialized = false;
    loginStatus = 200;
    setupState.initialized = false;
    process.env.OTORVA_BOOTSTRAP_TOKEN = 'server-side-bootstrap-secret-0123456789';
    delete process.env.OTORVA_API_URL;
    const create = axios.create.bind(axios);
    vi.spyOn(axios, 'create').mockImplementation((config) => create({ ...config, adapter }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OTORVA_BOOTSTRAP_TOKEN;
  });

  it('creates the first admin of an empty tracker with the server-side secret', async () => {
    const result = await exchangeOtorvaCredentials({
      email: ' Ada@Example.com ',
      firstName: 'Ada',
      lastName: 'Admin',
      mode: 'register',
      password: 'password123',
    });
    expect(result).toEqual({ ok: true, token: 'jwt-bootstrap' });
    const bootstrap = requests.find((r) => r.url === '/auth/bootstrap')!;
    expect(bootstrap.baseURL).toBe(OTORVA_DEFAULT_API_URL);
    expect(body(bootstrap)).toEqual({
      bootstrap_token: 'server-side-bootstrap-secret-0123456789',
      email: 'ada@example.com',
      first_name: 'Ada',
      last_name: 'Admin',
      password: 'password123',
    });
  });

  it('logs in when the tracker already has people, and on sign-in', async () => {
    otorvaInitialized = true;
    expect(await exchangeOtorvaCredentials({ email: 'a@b.c', mode: 'register', password: 'password123' })).toEqual({ ok: true, token: 'jwt-login' });
    expect(requests.some((r) => r.url === '/auth/bootstrap')).toBe(false);

    requests = [];
    const hostUrl = OTORVA_DEFAULT_API_URL.replace('otorva:8080', '127.0.0.1:8090');
    process.env.OTORVA_API_URL = hostUrl;
    expect(await exchangeOtorvaCredentials({ email: 'a@b.c', mode: 'login', password: 'password123' })).toEqual({ ok: true, token: 'jwt-login' });
    expect(requests.map((r) => r.url)).toEqual(['/auth/login']);
    expect(requests[0]?.baseURL).toBe(hostUrl);
  });

  it('refuses registration once the planner is set up, and without a bootstrap secret', async () => {
    setupState.initialized = true;
    expect(await exchangeOtorvaCredentials({ email: 'a@b.c', mode: 'register', password: 'password123' })).toMatchObject({ code: 'already_initialized', ok: false, status: 403 });
    expect(requests).toEqual([]);

    setupState.initialized = false;
    delete process.env.OTORVA_BOOTSTRAP_TOKEN;
    expect(await exchangeOtorvaCredentials({ email: 'a@b.c', mode: 'register', password: 'password123' })).toMatchObject({ code: 'bootstrap_missing', ok: false, status: 503 });
  });

  it('turns tracker errors into codes; the text comes from the UI dictionary', async () => {
    loginStatus = 401;
    expect(await exchangeOtorvaCredentials({ email: 'a@b.c', mode: 'login', password: 'wrong-pass' })).toEqual({
      code: 'invalid_credentials',
      ok: false,
      status: 401,
    });
    loginStatus = 429;
    expect(await exchangeOtorvaCredentials({ email: 'a@b.c', mode: 'login', password: 'wrong-pass' })).toMatchObject({ code: 'rate_limited', status: 429 });
    loginStatus = 502;
    expect(await exchangeOtorvaCredentials({ email: 'a@b.c', mode: 'login', password: 'wrong-pass' })).toMatchObject({ code: 'unavailable', status: 503 });
  });
});
