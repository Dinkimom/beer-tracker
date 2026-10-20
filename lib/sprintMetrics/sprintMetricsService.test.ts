import type { SprintListItem } from '@/types/tracker';

import { describe, expect, it } from 'vitest';

import { resolveMetricsWindowStartMs } from './aggregateSprintMetrics';
import { needsRecompute, selectSprintsForMetrics } from './sprintMetricsService';

function sprint(id: number, startDate: string): SprintListItem {
  return { id, startDate, startDateTime: `${startDate}T06:00:00.000Z` } as SprintListItem;
}

const NOW = Date.parse('2026-10-20T12:00:00.000Z');

describe('resolveMetricsWindowStartMs', () => {
  it('covers the requested number of quarters including the current one', () => {
    expect(new Date(resolveMetricsWindowStartMs(4, NOW)).toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(new Date(resolveMetricsWindowStartMs(1, NOW)).toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(new Date(resolveMetricsWindowStartMs(6, NOW)).toISOString()).toBe('2025-07-01T00:00:00.000Z');
  });
});

describe('selectSprintsForMetrics', () => {
  it('keeps started sprints inside the window, oldest first', () => {
    const selected = selectSprintsForMetrics(
      [sprint(3, '2026-10-12'), sprint(1, '2025-06-01'), sprint(2, '2026-02-02'), sprint(4, '2026-10-26')],
      Date.parse('2026-01-01T00:00:00.000Z'),
      NOW
    );
    expect(selected.map((item) => item.id)).toEqual([2, 3]);
  });
});

describe('needsRecompute', () => {
  const base = { endDate: '', facts: [], name: '', open: true, sprintId: 1, startDate: '' };

  it('recomputes missing and stale open sprints only', () => {
    expect(needsRecompute(undefined, NOW)).toBe(true);
    expect(needsRecompute({ ...base, computedAt: '2026-10-20T11:58:00.000Z', frozen: false }, NOW)).toBe(false);
    expect(needsRecompute({ ...base, computedAt: '2026-10-20T10:00:00.000Z', frozen: false }, NOW)).toBe(true);
    expect(needsRecompute({ ...base, computedAt: '2025-01-01T00:00:00.000Z', frozen: true }, NOW)).toBe(false);
  });
});
