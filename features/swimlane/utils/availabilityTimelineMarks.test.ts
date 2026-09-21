import type { AvailabilityCardKind } from '@/features/swimlane/utils/availabilityCardKind';
import type { AvailabilitySegment } from '@/features/swimlane/utils/availabilitySegments';

import { describe, expect, it } from 'vitest';

import { PARTS_PER_DAY } from '@/constants';

import {
  buildUnavailableDayHatchKinds,
  buildUnavailableDayTitles,
  buildUnavailableHatchRanges,
  isoDateOnlyFromWorkingDayIndex,
  pickAvailabilityHatchKind,
} from './availabilityTimelineMarks';

function segment(
  overrides: Partial<AvailabilitySegment> & Pick<AvailabilitySegment, 'dayIndices' | 'kind'>
): AvailabilitySegment {
  const dayIndices = overrides.dayIndices;
  const firstDay = Math.min(...dayIndices);
  const lastDay = Math.max(...dayIndices);
  return {
    dateRangeLabel: '31.08–02.09',
    durationInParts: (lastDay - firstDay + 1) * PARTS_PER_DAY,
    eventId: 'evt-1',
    startDay: firstDay,
    ...overrides,
    dayIndices,
  };
}

describe('buildUnavailableDayHatchKinds', () => {
  it('unions days and prefers sick leave over vacation on overlap', () => {
    expect(
      buildUnavailableDayHatchKinds([
        segment({ dayIndices: [0, 1], kind: 'vacation' }),
        segment({ dayIndices: [1, 2], eventId: 'evt-2', kind: 'sick_leave' }),
      ])
    ).toEqual(
      new Map([
        [0, 'vacation'],
        [1, 'sick_leave'],
        [2, 'sick_leave'],
      ])
    );
  });
});

describe('buildUnavailableHatchRanges', () => {
  it('merges consecutive days of the same kind into one strip', () => {
    expect(
      buildUnavailableHatchRanges(
        new Map([
          [0, 'vacation'],
          [1, 'vacation'],
          [2, 'vacation'],
          [4, 'duty'],
        ]),
        6
      )
    ).toEqual([
      { daySpan: 3, kind: 'vacation', startDay: 0 },
      { daySpan: 1, kind: 'duty', startDay: 4 },
    ]);
  });
});

describe('pickAvailabilityHatchKind', () => {
  it('picks duty over a tech sprint', () => {
    expect(pickAvailabilityHatchKind(['tech-sprint-web', 'duty'])).toBe('duty');
  });
});

describe('buildUnavailableDayTitles', () => {
  it('joins unique labels for a day covered by two events', () => {
    const labels: Record<AvailabilityCardKind, string> = {
      duty: 'Duty',
      sick_leave: 'Sick',
      'tech-sprint-back': 'Back',
      'tech-sprint-qa': 'QA',
      'tech-sprint-web': 'Web',
      vacation: 'Vacation',
    };
    const titles = buildUnavailableDayTitles(
      [
        segment({ dayIndices: [0, 1], kind: 'vacation' }),
        segment({
          dateRangeLabel: '01.09',
          dayIndices: [1],
          eventId: 'evt-2',
          kind: 'duty',
        }),
      ],
      (kind) => labels[kind]
    );
    expect(titles.get(0)).toBe('Vacation — 31.08–02.09');
    expect(titles.get(1)).toBe('Vacation — 31.08–02.09, Duty — 01.09');
  });
});

describe('isoDateOnlyFromWorkingDayIndex', () => {
  it('maps a sprint working-day index to a local ISO date', () => {
    expect(isoDateOnlyFromWorkingDayIndex(new Date(2025, 7, 11), 0, 5)).toBe('2025-08-11');
    expect(isoDateOnlyFromWorkingDayIndex(new Date(2025, 7, 11), 4, 5)).toBe('2025-08-15');
    expect(isoDateOnlyFromWorkingDayIndex(new Date(2025, 7, 11), 5, 5)).toBeNull();
  });
});
