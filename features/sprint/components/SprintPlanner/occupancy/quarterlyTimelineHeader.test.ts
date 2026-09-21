import { describe, expect, it } from 'vitest';

import {
  buildQuarterlyMonthSpans,
  buildQuarterlyWeekColumns,
  formatSprintHeaderShortLabel,
  formatWeekStartLabel,
} from './quarterlyTimelineHeader';

describe('buildQuarterlyWeekColumns', () => {
  it('builds two week columns per sprint', () => {
    const columns = buildQuarterlyWeekColumns([
      {
        id: 1,
        name: 'S1',
        startDate: new Date(2026, 3, 7),
        endDate: new Date(2026, 3, 20),
      },
    ]);
    expect(columns).toHaveLength(2);
    expect(columns[0].startDate.getMonth()).toBe(3);
    expect(columns[1].startDate.getTime()).toBeGreaterThan(columns[0].startDate.getTime());
  });
});

describe('buildQuarterlyMonthSpans', () => {
  it('merges adjacent weeks in the same month', () => {
    const weekColumns = buildQuarterlyWeekColumns([
      {
        id: 1,
        name: 'S1',
        startDate: new Date(2026, 3, 7),
        endDate: new Date(2026, 3, 20),
      },
      {
        id: 2,
        name: 'S2',
        startDate: new Date(2026, 3, 21),
        endDate: new Date(2026, 4, 4),
      },
    ]);
    const spans = buildQuarterlyMonthSpans(weekColumns, 'ru-RU');
    expect(spans.length).toBeGreaterThanOrEqual(1);
    expect(spans.reduce((s, m) => s + m.colSpan, 0)).toBe(weekColumns.length);
  });
});

describe('formatSprintHeaderShortLabel', () => {
  it('extracts trailing sprint number from full name', () => {
    expect(formatSprintHeaderShortLabel('Booking 2601')).toBe('2601');
  });
});

describe('formatWeekStartLabel', () => {
  it('returns a non-empty localized label', () => {
    expect(formatWeekStartLabel(new Date(2026, 3, 7), 'ru-RU').length).toBeGreaterThan(0);
  });
});
