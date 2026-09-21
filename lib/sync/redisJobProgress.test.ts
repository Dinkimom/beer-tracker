import { describe, expect, it } from 'vitest';

import { normalizeRedisJobProgress } from './redisJobProgress';

describe('normalizeRedisJobProgress', () => {
  it('handles number', () => {
    expect(normalizeRedisJobProgress(42)).toEqual({ meta: null, percent: 42 });
  });

  it('handles object with percent and meta', () => {
    expect(normalizeRedisJobProgress({ boardIndex: 1, percent: 33 })).toEqual({
      meta: { boardIndex: 1 },
      percent: 33,
    });
  });
});
