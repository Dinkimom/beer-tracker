import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleApiError, TRACKER_UPSTREAM_FORWARD_STATUSES } from './api-error-handler';
import { TrackerApiConfigError } from './trackerRequestConfig';

describe('handleApiError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 500 with internal_error and details for generic Error', async () => {
    const res = handleApiError(new Error('boom'), 'fetch screen');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: 'Failed to fetch screen',
      code: 'internal_error',
      details: 'boom',
    });
  });

  it('forwards upstream 401 as unauthorized so the client can re-auth', async () => {
    const err = { response: { status: 401, data: { errorMessage: 'Unauthorized' } } };
    const res = handleApiError(err, 'get current user (myself)');
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: 'Недействительный токен трекера. Войдите снова.',
      code: 'unauthorized',
    });
  });

  it('returns 429 with too_many_requests when upstream status is 429', async () => {
    const err = { response: { status: 429, data: {} } };
    const res = handleApiError(err, 'fetch screen');
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: 'Too many requests. Please try again later.',
      code: 'too_many_requests',
    });
  });

  it('forwards upstream 404 when forwardStatuses is set', async () => {
    const err = {
      response: {
        status: 404,
        data: { errorMessage: 'Issue not found' },
      },
    };
    const res = handleApiError(err, 'fetch issue', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: 'Issue not found',
      code: 'upstream_client_error',
    });
  });

  it('collapses upstream 404 to 500 when forwardStatuses is omitted', async () => {
    const err = {
      response: {
        status: 404,
        data: { errorMessage: 'Issue not found' },
      },
    };
    const res = handleApiError(err, 'fetch issue');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: 'Failed to fetch issue',
      code: 'internal_error',
    });
  });

  it('uses options.code when provided', async () => {
    const res = handleApiError(new Error('x'), 'op', { code: 'custom_reason' });
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({
      code: 'custom_reason',
    });
  });

  it('returns tracker_config for TrackerApiConfigError', async () => {
    const res = handleApiError(
      new TrackerApiConfigError('Нет трекера', 422),
      'fetch boards'
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      code: 'tracker_config',
      error: 'Нет трекера',
    });
  });
});
