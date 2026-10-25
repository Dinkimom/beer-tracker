import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { calculateOccupiedIntervals, findFirstFreeCell, findNextAvailableCell } from './intervalUtils';

describe('findFirstFreeCell', () => {
  it('returns min start on an empty lane', () => {
    expect(findFirstFreeCell([], 2, 4, 30)).toBe(4);
  });

  it('uses a gap between intervals when it fits', () => {
    expect(findFirstFreeCell([{ start: 0, end: 2 }, { start: 5, end: 8 }], 3, 0, 30)).toBe(2);
  });

  it('jumps past overlapping and unordered intervals', () => {
    expect(findFirstFreeCell([{ start: 5, end: 8 }, { start: 0, end: 4 }], 2, 1, 30)).toBe(8);
  });

  it('returns null when the window would cross the sprint end', () => {
    expect(findFirstFreeCell([{ start: 0, end: 28 }], 3, 0, 30)).toBeNull();
    expect(findFirstFreeCell([], 3, 28, 30)).toBeNull();
  });
});

describe('findNextAvailableCell', () => {
  it('honours the passed sprint length', () => {
    expect(findNextAvailableCell([], 3, 28, 30)).toBeNull();
    expect(findNextAvailableCell([], 3, 28, 45)).toBe(28);
  });
});

describe('calculateOccupiedIntervals', () => {
  it('occupies each plan segment separately', () => {
    const positions = new Map<string, TaskPosition>([
      [
        't1',
        {
          taskId: 't1',
          assignee: 'a',
          startDay: 0,
          startPart: 0,
          duration: 2,
          segments: [
            { startDay: 0, startPart: 0, duration: 1 },
            { startDay: 2, startPart: 0, duration: 1 },
          ],
        },
      ],
      ['t2', { taskId: 't2', assignee: 'b', startDay: 1, startPart: 1, duration: 2 }],
    ]);
    const occupied = calculateOccupiedIntervals(positions, ['a', 'b', 'c']);
    expect(occupied.get('a')).toEqual([
      { start: 0, end: 1 },
      { start: 6, end: 7 },
    ]);
    expect(occupied.get('b')).toEqual([{ start: 4, end: 6 }]);
    expect(occupied.get('c')).toEqual([]);
  });
});
