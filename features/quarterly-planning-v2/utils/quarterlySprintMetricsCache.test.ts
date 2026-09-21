import { describe, expect, it } from 'vitest';

import {
  isFrozenQuarterlySprintMetrics,
  quarterlySprintMetricsQueryOptions,
  QUARTERLY_SPRINT_METRICS_STALE_FROZEN_MS,
} from './quarterlySprintMetricsCache';

describe('isFrozenQuarterlySprintMetrics', () => {
  it('returns true for archived flag', () => {
    expect(isFrozenQuarterlySprintMetrics({ archived: true })).toBe(true);
  });

  it('returns true for archived/released status', () => {
    expect(isFrozenQuarterlySprintMetrics({ status: 'archived' })).toBe(true);
    expect(isFrozenQuarterlySprintMetrics({ status: 'released' })).toBe(true);
  });

  it('returns true when end date is before today', () => {
    const past = new Date();
    past.setDate(past.getDate() - 14);
    expect(isFrozenQuarterlySprintMetrics({ endDate: past })).toBe(true);
  });

  it('returns false for in-progress sprint in the future end', () => {
    const future = new Date();
    future.setDate(future.getDate() + 14);
    expect(
      isFrozenQuarterlySprintMetrics({
        archived: false,
        status: 'in_progress',
        endDate: future,
      })
    ).toBe(false);
  });
});

describe('quarterlySprintMetricsQueryOptions', () => {
  it('uses infinite staleTime for frozen sprints', () => {
    expect(quarterlySprintMetricsQueryOptions(true).staleTime).toBe(
      QUARTERLY_SPRINT_METRICS_STALE_FROZEN_MS
    );
  });
});
