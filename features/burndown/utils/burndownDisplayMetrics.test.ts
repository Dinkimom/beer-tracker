import { describe, expect, it } from 'vitest';

import { computeBurndownDisplayMetrics } from './burndownDisplayMetrics';

describe('computeBurndownDisplayMetrics', () => {
  it('возвращает нули при отсутствии данных или sprintTimelineTotals', () => {
    expect(computeBurndownDisplayMetrics(null)).toEqual({
      completedSP: 0,
      completedTP: 0,
      completionPercentSP: 0,
      completionPercentTP: 0,
      totalScopeSP: 0,
      totalScopeTP: 0,
    });
    expect(computeBurndownDisplayMetrics(undefined)).toEqual({
      completedSP: 0,
      completedTP: 0,
      completionPercentSP: 0,
      completionPercentTP: 0,
      totalScopeSP: 0,
      totalScopeTP: 0,
    });
    expect(computeBurndownDisplayMetrics({ sprintTimelineTotals: undefined })).toEqual({
      completedSP: 0,
      completedTP: 0,
      completionPercentSP: 0,
      completionPercentTP: 0,
      totalScopeSP: 0,
      totalScopeTP: 0,
    });
  });

  it('считает выполнено, total и проценты из sprintTimelineTotals', () => {
    const m = computeBurndownDisplayMetrics({
      sprintTimelineTotals: {
        totalSP: 80,
        totalTP: 20,
        doneSP: 40,
        doneTP: 8,
        remainingSP: 40,
        remainingTP: 12,
      },
    });
    expect(m.completedSP).toBe(40);
    expect(m.completedTP).toBe(8);
    expect(m.totalScopeSP).toBe(80);
    expect(m.totalScopeTP).toBe(20);
    expect(m.completionPercentSP).toBe(50);
    expect(m.completionPercentTP).toBe(40);
  });
});
