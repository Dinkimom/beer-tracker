import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { getMaxDuration, resizeSwimlanePlanSegment } from './positionUtils';

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

describe('resizeSwimlanePlanSegment', () => {
  it('extends one segment and recomputes the effective duration', () => {
    const resized = resizeSwimlanePlanSegment(twoSegments(), 1, 4, undefined, TOTAL);
    expect(resized?.segments).toEqual([
      { startDay: 0, startPart: 0, duration: 1 },
      { startDay: 2, startPart: 0, duration: 4 },
    ]);
    expect(resized?.duration).toBe(5);
  });

  it('moves the left edge with newStartCell', () => {
    const resized = resizeSwimlanePlanSegment(twoSegments(), 1, 3, 5, TOTAL);
    expect(resized?.segments?.[1]).toEqual({ startDay: 1, startPart: 2, duration: 3 });
  });

  it('merges with the neighbour when the gap closes', () => {
    const resized = resizeSwimlanePlanSegment(twoSegments(), 0, 6, undefined, TOTAL);
    expect(resized?.segments).toEqual([{ startDay: 0, startPart: 0, duration: 8 }]);
  });

  it('returns null when overlapping the next segment', () => {
    expect(resizeSwimlanePlanSegment(twoSegments(), 0, 7, undefined, TOTAL)).toBeNull();
  });

  it('returns null when overlapping the previous segment', () => {
    expect(resizeSwimlanePlanSegment(twoSegments(), 1, 3, 0, TOTAL)).toBeNull();
  });

  it('returns null past the sprint end and respects the passed length', () => {
    expect(resizeSwimlanePlanSegment(twoSegments(), 1, 25, undefined, TOTAL)).toBeNull();
    expect(resizeSwimlanePlanSegment(twoSegments(), 1, 25, undefined, 45)?.duration).toBe(26);
  });

  it('returns null for duration < 1, bad index or no segments', () => {
    expect(resizeSwimlanePlanSegment(twoSegments(), 1, 0, undefined, TOTAL)).toBeNull();
    expect(resizeSwimlanePlanSegment(twoSegments(), 5, 2, undefined, TOTAL)).toBeNull();
    const plain: TaskPosition = { taskId: 't', assignee: 'a', startDay: 0, startPart: 0, duration: 2 };
    expect(resizeSwimlanePlanSegment(plain, 0, 3, undefined, TOTAL)).toBeNull();
  });
});

describe('getMaxDuration', () => {
  it('is the remaining cells from the start', () => {
    const position: TaskPosition = { taskId: 't', assignee: 'a', startDay: 2, startPart: 1, duration: 2 };
    expect(getMaxDuration(position, TOTAL)).toBe(23);
    expect(getMaxDuration(position, 45)).toBe(38);
  });

  it('uses the earliest segment as start', () => {
    const position = twoSegments();
    position.segments = [
      { startDay: 3, startPart: 0, duration: 1 },
      { startDay: 1, startPart: 0, duration: 1 },
    ];
    expect(getMaxDuration(position, TOTAL)).toBe(27);
  });
});
