import { describe, expect, it } from 'vitest';

import { parseJiraSprintDate } from './jiraSprintDates';

describe('parseJiraSprintDate', () => {
  it('keeps the calendar date from an Agile ISO timestamp', () => {
    expect(parseJiraSprintDate('2026-08-31T09:00:00.000+03:00')).toEqual({
      date: '2026-08-31',
      dateTime: '2026-08-31T09:00:00.000+0300',
    });
  });

  it('parses GreenHopper D/Mon/YY', () => {
    expect(parseJiraSprintDate('31/Aug/26 12:00 AM')).toEqual({
      date: '2026-08-31',
      dateTime: '2026-08-31T00:00:00.000+0000',
    });
  });

  it('treats None as empty', () => {
    expect(parseJiraSprintDate('None')).toEqual({ date: '', dateTime: '' });
  });
});
