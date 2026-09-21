import { afterEach, describe, expect, it, vi } from 'vitest';

import { isSprintRealtimeRedisEnabled } from './sprintRealtimeConstants';

describe('isSprintRealtimeRedisEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is enabled outside development', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('REALTIME_REDIS_IN_DEV', undefined);
    expect(isSprintRealtimeRedisEnabled()).toBe(true);
  });

  it('is disabled in development unless REALTIME_REDIS_IN_DEV is set', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('REALTIME_REDIS_IN_DEV', undefined);
    expect(isSprintRealtimeRedisEnabled()).toBe(false);

    vi.stubEnv('REALTIME_REDIS_IN_DEV', '1');
    expect(isSprintRealtimeRedisEnabled()).toBe(true);
  });
});
