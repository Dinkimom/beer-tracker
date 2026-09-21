import { describe, expect, it } from 'vitest';

import {
  buildQuarterlyWeekColumns,
  getWeekColumnIndicesForSprint,
  resolveUnregisteredSprintNumber,
} from './quarterlyTimelineHeader';

describe('getWeekColumnIndicesForSprint', () => {
  it('returns week column indices for the sprint', () => {
    const sprintInfos = [
      {
        id: 1,
        name: 'S1',
        startDate: new Date(2026, 0, 5),
        endDate: new Date(2026, 0, 18),
      },
      {
        id: 2,
        name: 'S2',
        startDate: new Date(2026, 0, 19),
        endDate: new Date(2026, 1, 1),
      },
    ];

    expect(getWeekColumnIndicesForSprint(sprintInfos, 1)).toEqual([0, 1]);
    expect(getWeekColumnIndicesForSprint(sprintInfos, 2)).toEqual([2, 3]);
    expect(buildQuarterlyWeekColumns(sprintInfos)).toHaveLength(4);
  });
});

describe('resolveUnregisteredSprintNumber', () => {
  it('increments from last registered sprint number', () => {
    const sprintInfos = [
      { name: 'Booking 2601', startDate: new Date(2026, 0, 5), isUnregistered: false },
      { name: 'Booking 2602', startDate: new Date(2026, 0, 19), isUnregistered: false },
      { name: '', startDate: new Date(2026, 1, 2), isUnregistered: true },
      { name: '', startDate: new Date(2026, 1, 16), isUnregistered: true },
    ];

    expect(resolveUnregisteredSprintNumber(sprintInfos, 2)).toBe('2603');
    expect(resolveUnregisteredSprintNumber(sprintInfos, 3)).toBe('2604');
  });
});
