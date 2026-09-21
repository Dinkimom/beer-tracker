import { describe, expect, it } from 'vitest';

import { formatAdminDateTime } from './adminFormatters';

describe('formatAdminDateTime', () => {
  it('returns em-dash for null', () => {
    expect(formatAdminDateTime(null)).toBe('—');
  });

  it('returns em-dash for empty string', () => {
    expect(formatAdminDateTime('')).toBe('—');
  });

  it('returns the original string for an invalid date', () => {
    expect(formatAdminDateTime('not-a-date')).toBe('not-a-date');
  });

  it('returns a non-empty string for a valid ISO date', () => {
    const result = formatAdminDateTime('2024-01-15T12:00:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('—');
  });
});
