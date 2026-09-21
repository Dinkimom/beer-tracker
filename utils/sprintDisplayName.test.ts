import { describe, expect, it } from 'vitest';

import {
  compareSprintNamesByNumberDesc,
  extractSprintNumberFromName,
  formatSprintDisplayName,
  formatSprintHeaderShortLabelWithQuarter,
  formatSprintSelectOptionLabel,
} from './sprintDisplayName';

describe('extractSprintNumberFromName', () => {
  it('extracts trailing sprint number from team-prefixed name', () => {
    expect(extractSprintNumberFromName('Booking 2601')).toBe('2601');
  });

  it('extracts sprint number with decimal suffix', () => {
    expect(extractSprintNumberFromName('Booking 2601.1')).toBe('2601.1');
  });
});

describe('compareSprintNamesByNumberDesc', () => {
  it('orders decimal suffixes within the same base sprint', () => {
    expect(
      compareSprintNamesByNumberDesc('Booking 2601.1', 'Booking 2601.2')
    ).toBeGreaterThan(0);
    expect(
      compareSprintNamesByNumberDesc('Booking 2601.2', 'Booking 2601.1')
    ).toBeLessThan(0);
  });
});

describe('formatSprintDisplayName', () => {
  it('prefixes quarter with sprint number only', () => {
    expect(formatSprintDisplayName('Booking 2601', 'Q1')).toBe('Q1 · 2601');
  });

  it('returns sprint number when quarter is missing', () => {
    expect(formatSprintDisplayName('Booking 2601', null)).toBe('2601');
  });

  it('preserves decimal sprint suffix with quarter', () => {
    expect(formatSprintDisplayName('Booking 2601.1', 'Q1')).toBe('Q1 · 2601.1');
  });
});

describe('formatSprintSelectOptionLabel', () => {
  it('appends date range when both dates exist', () => {
    expect(
      formatSprintSelectOptionLabel({
        endDate: '2026-09-14T12:00:00',
        name: 'Booking 2601',
        quarter: 'Q1',
        startDate: '2026-09-01T12:00:00',
      })
    ).toBe('Q1 · 2601 (01.09 - 14.09)');
  });

  it('returns display name when dates are missing', () => {
    expect(
      formatSprintSelectOptionLabel({
        name: 'Booking 2601',
        quarter: 'Q1',
      })
    ).toBe('Q1 · 2601');
  });
});

describe('formatSprintHeaderShortLabelWithQuarter', () => {
  it('matches full sprint display label', () => {
    expect(formatSprintHeaderShortLabelWithQuarter('Booking 2601', 'Q1')).toBe('Q1 · 2601');
  });

  it('returns sprint number when quarter is missing', () => {
    expect(formatSprintHeaderShortLabelWithQuarter('Booking 2601', null)).toBe('2601');
  });
});
