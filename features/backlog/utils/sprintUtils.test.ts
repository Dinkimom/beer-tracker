import { describe, expect, it } from 'vitest';

import { formatSprintRangeLabel } from './sprintUtils';

describe('formatSprintRangeLabel', () => {
  it('formats a date range in the given locale', () => {
    expect(formatSprintRangeLabel('2026-09-23', '2026-10-04', 'ru-RU')).toBe('23 сент. — 4 окт.');
  });

  it('returns null when a date is missing', () => {
    expect(formatSprintRangeLabel('', '2026-10-04', 'ru-RU')).toBeNull();
    expect(formatSprintRangeLabel('2026-09-23', '', 'ru-RU')).toBeNull();
  });
});
