import type { StoryPhasePosition } from '../types';

import { describe, expect, it } from 'vitest';

import { storyPhaseOverlapsAny, storyPhaseWeekRange, weekRangesOverlap } from './quarterlyPhaseWeekRange';
import { toWeekColumnPosition } from './quarterlyWeekPositions';

const toWeekPosition = toWeekColumnPosition;

describe('weekRangesOverlap', () => {
  it('detects overlapping ranges', () => {
    expect(weekRangesOverlap({ startWeek: 0, endWeek: 2 }, { startWeek: 2, endWeek: 4 })).toBe(
      true
    );
    expect(weekRangesOverlap({ startWeek: 0, endWeek: 1 }, { startWeek: 3, endWeek: 4 })).toBe(
      false
    );
  });
});

describe('storyPhaseOverlapsAny', () => {
  const delivery: StoryPhasePosition = {
    id: 'd',
    kind: 'delivery',
    sprintIndex: 0,
    startDay: 0,
    durationDays: 10,
  };
  const discovery: StoryPhasePosition = {
    id: 'i',
    kind: 'discovery',
    sprintIndex: 0,
    startDay: 5,
    durationDays: 5,
  };

  it('returns true when phases share weeks', () => {
    expect(
      storyPhaseOverlapsAny('NW-1', discovery, [delivery], toWeekPosition)
    ).toBe(true);
  });

  it('returns false for non-overlapping phases', () => {
    const farDiscovery: StoryPhasePosition = {
      ...discovery,
      startDay: 0,
      sprintIndex: 2,
      durationDays: 3,
    };
    expect(
      storyPhaseOverlapsAny('NW-1', farDiscovery, [delivery], toWeekPosition)
    ).toBe(false);
  });
});

describe('storyPhaseWeekRange', () => {
  it('maps phase to week indices', () => {
    const phase: StoryPhasePosition = {
      id: '1',
      kind: 'delivery',
      sprintIndex: 0,
      startDay: 0,
      durationDays: 5,
    };
    expect(storyPhaseWeekRange('NW-1', phase, toWeekPosition)).toEqual({
      startWeek: 0,
      endWeek: 0,
    });
  });
});
