import { describe, expect, it } from 'vitest';

import { timelineDayDividerClass } from './timelineColumnChrome';

describe('timelineDayDividerClass', () => {
  it('omits the divider on the last day', () => {
    expect(timelineDayDividerClass(4, 5)).toBeNull();
  });

  it('uses the same grid color on every day, including a day off', () => {
    expect(timelineDayDividerClass(0, 5)).toBe(timelineDayDividerClass(2, 5));
    expect(timelineDayDividerClass(0, 5)).toContain('bg-gray-300/80');
    expect(timelineDayDividerClass(0, 5)).toContain('dark:bg-gray-600');
  });
});
