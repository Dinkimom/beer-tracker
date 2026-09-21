import type { AxiosAdapter, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';

import { createTrackerAxiosInstance, requireTrackerAxiosForApiRoute } from './trackerAxiosFactory';

function okResponse(config: InternalAxiosRequestConfig) {
  return Promise.resolve({
    config,
    data: { ok: true },
    headers: {},
    status: 200,
    statusText: 'OK',
  });
}

function reject429(
  config: InternalAxiosRequestConfig,
  headers: Record<string, string> = {}
) {
  return Promise.reject(
    Object.assign(new Error('429'), {
      config,
      response: {
        data: {},
        headers,
        status: 429,
        statusText: 'Too Many Requests',
      },
    })
  );
}

function rejectGateway(
  config: InternalAxiosRequestConfig,
  status: 502 | 503 | 504,
  statusText: string
) {
  return Promise.reject(
    Object.assign(new Error(String(status)), {
      config,
      response: {
        data: '',
        headers: {},
        status,
        statusText,
      },
    })
  );
}

describe('requireTrackerAxiosForApiRoute', () => {
  it('throws when client is undefined', () => {
    expect(() => requireTrackerAxiosForApiRoute(undefined)).toThrow(
      /getTrackerApiFromRequest/
    );
  });

  it('returns the same instance when defined', () => {
    const client = { get: () => Promise.resolve({ data: null }) } as unknown as AxiosInstance;
    expect(requireTrackerAxiosForApiRoute(client)).toBe(client);
  });
});

describe('createTrackerAxiosInstance', () => {
  it('sets Authorization and X-Org-ID headers', () => {
    const instance = createTrackerAxiosInstance({
      oauthToken: 'test-oauth',
      orgId: 'org-1',
      apiUrl: 'https://example.test/v2',
    });
    const defaults = instance.defaults.headers;
    const common = typeof defaults === 'object' && defaults && 'common' in defaults
      ? (defaults as { common?: Record<string, string> }).common
      : undefined;
    const auth =
      common?.Authorization ??
      (defaults as { Authorization?: string }).Authorization;
    expect(String(auth)).toContain('OAuth test-oauth');
    expect(instance.defaults.baseURL).toBe('https://example.test/v2');
  });
});

describe('createTrackerAxiosInstance 429 retry', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries once after 429 with exponential backoff delay then succeeds', async () => {
    const adapter = vi
      .fn((config: InternalAxiosRequestConfig) => okResponse(config))
      .mockImplementationOnce((config: InternalAxiosRequestConfig) => reject429(config))
      .mockImplementation((config: InternalAxiosRequestConfig) => okResponse(config));

    const instance = createTrackerAxiosInstance({
      adapter: adapter as unknown as AxiosAdapter,
      oauthToken: 't',
      orgId: 'o',
      apiUrl: 'https://api.test/v2',
    });

    const p = instance.get('/issues');
    await vi.advanceTimersByTimeAsync(2000);
    const res = await p;

    expect(adapter).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it('uses Retry-After seconds when header is present', async () => {
    const adapter = vi
      .fn((config: InternalAxiosRequestConfig) => okResponse(config))
      .mockImplementationOnce((config: InternalAxiosRequestConfig) =>
        reject429(config, { 'retry-after': '2' })
      )
      .mockImplementation((config: InternalAxiosRequestConfig) => okResponse(config));

    const instance = createTrackerAxiosInstance({
      adapter: adapter as unknown as AxiosAdapter,
      oauthToken: 't',
      orgId: 'o',
    });

    const p = instance.get('/x');
    await vi.advanceTimersByTimeAsync(2000);
    await p;

    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it('stops after MAX_RETRIES and rejects', async () => {
    const adapter = vi.fn((config: InternalAxiosRequestConfig) => reject429(config));

    const instance = createTrackerAxiosInstance({
      adapter: adapter as unknown as AxiosAdapter,
      oauthToken: 't',
      orgId: 'o',
    });

    const p = instance.get('/fail');
    const settled = p.then(
      () => {
        throw new Error('expected request to reject after retries');
      },
      (e: unknown) => e
    );
    for (let i = 0; i < 7; i++) {
      await vi.advanceTimersByTimeAsync(120_000);
    }

    const err = await settled;
    expect(err).toMatchObject({ response: { status: 429 } });
    expect(adapter).toHaveBeenCalledTimes(7);
  });
});

describe('createTrackerAxiosInstance gateway retry', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries once after 504 then succeeds', async () => {
    const adapter = vi
      .fn((config: InternalAxiosRequestConfig) => okResponse(config))
      .mockImplementationOnce((config: InternalAxiosRequestConfig) =>
        rejectGateway(config, 504, 'Gateway Timeout')
      );

    const instance = createTrackerAxiosInstance({
      adapter: adapter as unknown as AxiosAdapter,
      oauthToken: 't',
      orgId: 'o',
      apiUrl: 'https://api.test/v2',
    });

    const p = instance.get('/issues/_search');
    await vi.advanceTimersByTimeAsync(2000);
    const res = await p;

    expect(adapter).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });
});
