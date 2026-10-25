import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { moveSwimlanePlanSegmentToStartCell } from './swimlanePlanSegments';

const TOTAL = 30;

function twoSegments(): TaskPosition {
  return {
    taskId: 't',
    assignee: 'a',
    startDay: 0,
    startPart: 0,
    duration: 3,
    segments: [
      { startDay: 0, startPart: 0, duration: 1 },
      { startDay: 2, startPart: 0, duration: 2 },
    ],
  };
}

describe('moveSwimlanePlanSegmentToStartCell', () => {
  it('moves one segment and keeps the others', () => {
    const moved = moveSwimlanePlanSegmentToStartCell(twoSegments(), 1, 9, TOTAL);
    expect(moved?.segments).toEqual([
      { startDay: 0, startPart: 0, duration: 1 },
      { startDay: 3, startPart: 0, duration: 2 },
    ]);
    expect(moved).toMatchObject({ startDay: 0, startPart: 0, duration: 3 });
  });

  it('merges segments that become adjacent', () => {
    const moved = moveSwimlanePlanSegmentToStartCell(twoSegments(), 1, 1, TOTAL);
    expect(moved?.segments).toEqual([{ startDay: 0, startPart: 0, duration: 3 }]);
  });

  it('re-sorts when a segment moves before the first one', () => {
    const moved = moveSwimlanePlanSegmentToStartCell(twoSegments(), 0, 12, TOTAL);
    expect(moved?.segments).toEqual([
      { startDay: 2, startPart: 0, duration: 2 },
      { startDay: 4, startPart: 0, duration: 1 },
    ]);
    expect(moved).toMatchObject({ startDay: 2, startPart: 0 });
  });

  it('returns null when the segment leaves the sprint', () => {
    expect(moveSwimlanePlanSegmentToStartCell(twoSegments(), 1, 29, TOTAL)).toBeNull();
    expect(moveSwimlanePlanSegmentToStartCell(twoSegments(), 0, -1, TOTAL)).toBeNull();
    expect(moveSwimlanePlanSegmentToStartCell(twoSegments(), 1, 29, 45)).not.toBeNull();
  });

  it('returns null on overlap with another segment of the same position', () => {
    expect(moveSwimlanePlanSegmentToStartCell(twoSegments(), 0, 6, TOTAL)).toBeNull();
  });

  it('returns null without segments or with a bad index', () => {
    const plain: TaskPosition = { taskId: 't', assignee: 'a', startDay: 0, startPart: 0, duration: 2 };
    expect(moveSwimlanePlanSegmentToStartCell(plain, 0, 3, TOTAL)).toBeNull();
    expect(moveSwimlanePlanSegmentToStartCell(twoSegments(), 2, 3, TOTAL)).toBeNull();
  });
});
