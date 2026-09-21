import { describe, expect, it } from 'vitest';

import { formatDuration } from './formatOccupancyDuration';

describe('formatDuration (occupancy)', () => {
  it('formats working days and remaining hours', () => {
    const eightHours = 8 * 60 * 60 * 1000;
    expect(formatDuration(2 * eightHours + 3 * 60 * 60 * 1000)).toBe('2д 3ч');
  });

  it('returns 0ч for zero', () => {
    expect(formatDuration(0)).toBe('0ч');
  });

  it('shows minutes when under one working hour and no days', () => {
    expect(formatDuration(30 * 60 * 1000)).toBe('30м');
  });
});
