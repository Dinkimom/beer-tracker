import { describe, expect, it } from 'vitest';

import {
  mergeOrgHolidayCountry,
  readOrgHolidayCountry,
  readOrgHolidayCountryState,
} from './orgHolidayCountry';

describe('readOrgHolidayCountry', () => {
  it('defaults to ru and normalizes codes', () => {
    expect(readOrgHolidayCountry(null)).toBe('ru');
    expect(readOrgHolidayCountry({ planner: { holidayCountry: 'KZ' } })).toBe('kz');
    expect(readOrgHolidayCountry({ planner: { holidayCountry: 'xx' } })).toBe('ru');
  });

  it('tracks whether the value was stored', () => {
    expect(readOrgHolidayCountryState(null)).toEqual({
      holidayCountry: 'ru',
      isStored: false,
    });
    expect(readOrgHolidayCountryState({ planner: { timeslotsPerDay: 2 } })).toEqual({
      holidayCountry: 'ru',
      isStored: false,
    });
    expect(readOrgHolidayCountryState({ planner: { holidayCountry: 'de' } })).toEqual({
      holidayCountry: 'de',
      isStored: true,
    });
  });
});

describe('mergeOrgHolidayCountry', () => {
  it('preserves other planner fields', () => {
    expect(
      mergeOrgHolidayCountry(
        { planner: { estimateUnit: 'day', timeslotsPerDay: 2 }, other: 1 },
        'de'
      )
    ).toEqual({
      other: 1,
      planner: { estimateUnit: 'day', holidayCountry: 'de', timeslotsPerDay: 2 },
    });
  });
});
