import { describe, expect, it } from 'vitest';

import { hasTranslation } from '@/lib/i18n/translator';

import { getHolidayForDate } from './holidays';

describe('getHolidayForDate', () => {
  it('returns emoji and caption key for a known holiday', () => {
    expect(getHolidayForDate(new Date(2026, 0, 1))).toEqual({
      captionKey: 'holidays.captions.01-01',
      emoji: '🎉',
    });
    expect(hasTranslation('en', 'holidays.captions.01-01')).toBe(true);
    expect(hasTranslation('ru', 'holidays.captions.01-01')).toBe(true);
  });

  it('returns null when the date is not a holiday', () => {
    expect(getHolidayForDate(new Date(2026, 0, 2))).toBeNull();
  });
});
