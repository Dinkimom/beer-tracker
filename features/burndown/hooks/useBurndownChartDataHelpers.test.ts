import { describe, expect, it } from 'vitest';

import { formatBurndownChartDateLabel, resolveBurndownTodayAxisLabel } from './useBurndownChartDataHelpers';

describe('resolveBurndownTodayAxisLabel', () => {
  const today = new Date(2026, 9, 4);
  const todayLabel = formatBurndownChartDateLabel(today);

  it('returns the axis label when today is on the chart', () => {
    expect(resolveBurndownTodayAxisLabel(['23.09', todayLabel, '03.10'], today)).toBe(todayLabel);
  });

  it('returns null when today is outside the series', () => {
    expect(resolveBurndownTodayAxisLabel(['23.09', '03.10'], today)).toBeNull();
  });
});
