import { afterEach, describe, expect, it } from 'vitest';

import { getPlannerNow, getPlannerNowMs, setPlannerNowOverride } from './plannerClock';

describe('plannerClock', () => {
  afterEach(() => {
    setPlannerNowOverride(null);
  });

  it('uses real time when override is cleared', () => {
    setPlannerNowOverride(null);
    const before = Date.now();
    const ms = getPlannerNowMs();
    const after = Date.now();
    expect(ms).toBeGreaterThanOrEqual(before);
    expect(ms).toBeLessThanOrEqual(after);
  });

  it('returns a copy of the overridden instant', () => {
    const fixed = new Date(2026, 9, 16, 12, 0, 0);
    setPlannerNowOverride(fixed);
    const a = getPlannerNow();
    const b = getPlannerNow();
    expect(a.getTime()).toBe(fixed.getTime());
    expect(b.getTime()).toBe(fixed.getTime());
    expect(a).not.toBe(b);
    expect(getPlannerNowMs()).toBe(fixed.getTime());
  });
});
