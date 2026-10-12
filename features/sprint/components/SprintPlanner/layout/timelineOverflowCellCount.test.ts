import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { timelineOverflowCellCount } from './timelineOverflowCellCount';

function position(partial: Pick<TaskPosition, 'duration' | 'startDay' | 'startPart'> & {
  segments?: TaskPosition['segments'];
}): TaskPosition {
  return {
    assignee: 'dev',
    taskId: 'task',
    ...partial,
  };
}

describe('timelineOverflowCellCount', () => {
  it('returns 0 when every card ends inside the timeline', () => {
    const positions = [
      position({ duration: 6, startDay: 4, startPart: 0 }),
      position({ duration: 3, startDay: 9, startPart: 0 }),
    ];
    expect(timelineOverflowCellCount(positions, 30)).toBe(0);
  });

  it('counts cells past the last slot when a long card starts on Friday', () => {
    const positions = [position({ duration: 6, startDay: 9, startPart: 0 })];
    expect(timelineOverflowCellCount(positions, 30)).toBe(3);
  });

  it('uses the furthest segment end', () => {
    const positions = [
      position({
        duration: 4,
        segments: [
          { duration: 1, startDay: 0, startPart: 0 },
          { duration: 6, startDay: 9, startPart: 1 },
        ],
        startDay: 0,
        startPart: 0,
      }),
    ];
    expect(timelineOverflowCellCount(positions, 30)).toBe(4);
  });

  it('returns 0 for an empty plan or a non-positive timeline', () => {
    expect(timelineOverflowCellCount([], 30)).toBe(0);
    expect(timelineOverflowCellCount([position({ duration: 6, startDay: 9, startPart: 0 })], 0)).toBe(0);
  });
});
