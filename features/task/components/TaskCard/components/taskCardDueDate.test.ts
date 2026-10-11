import { describe, expect, it } from 'vitest';

import { formatTaskCardDueDateLabel, resolveTaskCardDueDate } from './taskCardDueDate';

const NOW = new Date(2026, 9, 11, 15, 0, 0);

describe('resolveTaskCardDueDate', () => {
  it('hides the chip when there is no deadline', () => {
    expect(resolveTaskCardDueDate(undefined, { completed: false, language: 'ru', now: NOW })).toBeNull();
    expect(resolveTaskCardDueDate('   ', { completed: false, language: 'ru', now: NOW })).toBeNull();
    expect(resolveTaskCardDueDate('not-a-date', { completed: false, language: 'ru', now: NOW })).toBeNull();
    expect(resolveTaskCardDueDate('2026-02-31', { completed: false, language: 'ru', now: NOW })).toBeNull();
  });

  it('formats a future date as on schedule', () => {
    expect(resolveTaskCardDueDate('2026-10-14', { completed: false, language: 'ru', now: NOW })).toEqual({
      isoDate: '2026-10-14',
      label: '14 окт. 2026 г.',
      overdue: false,
    });
  });

  it('keeps today on schedule', () => {
    expect(resolveTaskCardDueDate('2026-10-11T00:00:00.000+0000', {
      completed: false,
      language: 'ru',
      now: NOW,
    })?.overdue).toBe(false);
  });

  it('marks a past date overdue until the task is done', () => {
    expect(resolveTaskCardDueDate('2026-09-10', { completed: false, language: 'ru', now: NOW })).toEqual({
      isoDate: '2026-09-10',
      label: '10 сент. 2026 г.',
      overdue: true,
    });
    expect(resolveTaskCardDueDate('2026-09-10', { completed: true, language: 'ru', now: NOW })?.overdue).toBe(
      false
    );
  });
});

describe('formatTaskCardDueDateLabel', () => {
  it('uses a day-month-year label in English', () => {
    expect(formatTaskCardDueDateLabel('2026-10-14', 'en')).toBe('14 Oct 2026');
  });
});
