import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { describe, expect, it } from 'vitest';

import { PARTS_PER_DAY } from '@/constants';

import { getSegmentsForDeveloper } from './availabilitySegments';
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
