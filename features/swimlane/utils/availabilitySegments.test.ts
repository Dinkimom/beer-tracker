import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { describe, expect, it } from 'vitest';

import { PARTS_PER_DAY } from '@/constants';

import { getSegmentsForDeveloper, resolveAvailabilityDayRange } from './availabilitySegments';
import { getWidthPercent } from './positionUtils';

function boardEvent(
  memberId: string,
  startDate: string,
  endDate: string
): BoardAvailabilityEvent {
  return {
    id: 'evt-1',
    memberId,
    memberName: 'Dev',
    startDate,
    endDate,
    eventType: 'duty',
  };
}

describe('getSegmentsForDeveloper', () => {
  /** Пн 10.08.2025 */
  const sprintStart = new Date(2025, 7, 11);

  it('5-day event in 5-day sprint spans full timeline width', () => {
    const events = [boardEvent('dev-1', '2025-08-11', '2025-08-15')];
    const workingDaysCount = 5;
    const segments = getSegmentsForDeveloper(
      'dev-1',
      sprintStart,
      events,
      workingDaysCount
    );

    expect(segments).toHaveLength(1);
    expect(segments[0]!.eventId).toBe('evt-1');
    expect(segments[0]!.dayIndices).toEqual([0, 1, 2, 3, 4]);
    expect(segments[0]!.durationInParts).toBe(workingDaysCount * PARTS_PER_DAY);

    const timelineTotalParts = workingDaysCount * PARTS_PER_DAY;
    expect(getWidthPercent(segments[0]!.durationInParts, timelineTotalParts)).toBe(100);
  });

  it('5-day event with 10-day default denominator would be half width (regression guard)', () => {
    const events = [boardEvent('dev-1', '2025-08-11', '2025-08-15')];
    const segments = getSegmentsForDeveloper('dev-1', sprintStart, events, 5);

    const wrongTimelineTotalParts = 10 * PARTS_PER_DAY;
    expect(getWidthPercent(segments[0]!.durationInParts, wrongTimelineTotalParts)).toBe(50);
  });
});

describe('resolveAvailabilityDayRange', () => {
  /** Пн 11.08.2025 */
  const sprintStart = new Date(2025, 7, 11);
  const base = { sprintStartDate: sprintStart, workingDaysCount: 10 };

  it('maps a single clicked day to one column', () => {
    expect(
      resolveAvailabilityDayRange({ ...base, endDate: '2025-08-13', startDate: '2025-08-13' })
    ).toEqual({ dayCount: 1, startDay: 2 });
  });

  it('spans the weekend as working-day columns', () => {
    expect(
      resolveAvailabilityDayRange({ ...base, endDate: '2025-08-19', startDate: '2025-08-14' })
    ).toEqual({ dayCount: 4, startDay: 3 });
  });

  it('clips a period that starts before the sprint', () => {
    expect(
      resolveAvailabilityDayRange({ ...base, endDate: '2025-08-12', startDate: '2025-08-01' })
    ).toEqual({ dayCount: 2, startDay: 0 });
  });

  it('returns null outside the sprint or for an inverted range', () => {
    expect(
      resolveAvailabilityDayRange({ ...base, endDate: '2025-07-10', startDate: '2025-07-01' })
    ).toBeNull();
    expect(
      resolveAvailabilityDayRange({ ...base, endDate: '2025-08-11', startDate: '2025-08-15' })
    ).toBeNull();
    expect(resolveAvailabilityDayRange({ ...base, endDate: '', startDate: '' })).toBeNull();
  });
});
