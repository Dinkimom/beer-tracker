import { describe, expect, it } from 'vitest';

import { resolveBurndownYAxisTicks } from './burndownAreaChartHelpers';

describe('resolveBurndownYAxisTicks', () => {
  it('starts at zero and covers the peak', () => {
    const ticks = resolveBurndownYAxisTicks([49, 55, null, undefined]);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(55);
  });

  it('uses a step that lands on zero for a small scale', () => {
    expect(resolveBurndownYAxisTicks([8, 6, 0])).toEqual([0, 2, 4, 6, 8]);
  });

  it('keeps a visible range when every value is zero', () => {
    expect(resolveBurndownYAxisTicks([0, null])).toEqual([0, 1]);
  });
});
