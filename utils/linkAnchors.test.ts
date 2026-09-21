import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { PARTS_PER_DAY } from '@/constants';

import {
  areAdjacentSwimlaneTimeslots,
  compareTaskPositionsOnTimeline,
  getQALinkAnchors,
  orderTaskIdsByTimeline,
  resolveLinkArrowDrawTaskIds,
  taskPositionsOverlapOnTimeline,
} from './linkAnchors';

function pos(assignee: string, startCell: number, endCell: number): TaskPosition {
  return {
    assignee,
    duration: endCell - startCell,
    startDay: Math.floor(startCell / PARTS_PER_DAY),
    startPart: startCell % PARTS_PER_DAY,
    taskId: 't',
  };
}

describe('areAdjacentSwimlaneTimeslots', () => {
  it('detects touching and one-slot-gap ranges', () => {
    expect(areAdjacentSwimlaneTimeslots(0, 2, 2, 4)).toBe(true);
    expect(areAdjacentSwimlaneTimeslots(0, 2, 3, 5)).toBe(true);
  });

  it('rejects large temporal gap', () => {
    expect(areAdjacentSwimlaneTimeslots(0, 2, 10, 12)).toBe(false);
  });

  it('rejects target entirely before source with a gap', () => {
    expect(areAdjacentSwimlaneTimeslots(10, 12, 0, 2)).toBe(false);
  });
});

describe('compareTaskPositionsOnTimeline / orderTaskIdsByTimeline', () => {
  it('orders non-overlapping cards by who starts later', () => {
    expect(compareTaskPositionsOnTimeline(pos('dev-a', 0, 2), pos('dev-a', 4, 6))).toBeLessThan(0);
    expect(taskPositionsOverlapOnTimeline(pos('dev-a', 0, 2), pos('dev-a', 4, 6))).toBe(false);
    expect(
      orderTaskIdsByTimeline(
        'later',
        'earlier',
        new Map([
          ['earlier', pos('dev-a', 0, 2)],
          ['later', pos('dev-a', 10, 12)],
        ])
      )
    ).toEqual({ earlierTaskId: 'earlier', laterTaskId: 'later' });
  });

  it('when cards overlap, tip goes to the one that ends later', () => {
    const long = pos('dev-a', 0, 10);
    const nested = pos('dev-a', 2, 5);
    expect(taskPositionsOverlapOnTimeline(long, nested)).toBe(true);
    expect(compareTaskPositionsOnTimeline(long, nested)).toBeGreaterThan(0);
    expect(
      orderTaskIdsByTimeline(
        'nested',
        'long',
        new Map([
          ['long', long],
          ['nested', nested],
        ])
      )
    ).toEqual({ earlierTaskId: 'nested', laterTaskId: 'long' });
  });

  it('touching end-to-start is not an overlap; tip follows who starts later', () => {
    const left = pos('dev-a', 0, 4);
    const right = pos('dev-a', 4, 8);
    expect(taskPositionsOverlapOnTimeline(left, right)).toBe(false);
    expect(
      orderTaskIdsByTimeline(
        'right',
        'left',
        new Map([
          ['left', left],
          ['right', right],
        ])
      )
    ).toEqual({ earlierTaskId: 'left', laterTaskId: 'right' });
  });
});

describe('resolveLinkArrowDrawTaskIds', () => {
  it('points the tip at the later card regardless of stored from→to', () => {
    const positions = new Map([
      ['a', pos('dev-a', 0, 2)],
      ['b', pos('dev-a', 10, 12)],
    ]);
    expect(resolveLinkArrowDrawTaskIds('b', 'a', positions)).toEqual({
      startTaskId: 'a',
      endTaskId: 'b',
    });
  });

  it('keeps stored direction when forced (dev→QA)', () => {
    const positions = new Map([
      ['qa', pos('qa', 0, 2)],
      ['dev', pos('dev', 10, 12)],
    ]);
    expect(resolveLinkArrowDrawTaskIds('dev', 'qa', positions, true)).toEqual({
      startTaskId: 'dev',
      endTaskId: 'qa',
    });
  });
});

describe('getQALinkAnchors', () => {
  it('returns right→left defaults for persistence (draw-time uses DOM)', () => {
    expect(
      getQALinkAnchors(
        { id: 'dev', key: 'D-1', summary: '', status: 'open' } as never,
        pos('dev-a', 0, 2),
        { id: 'qa', key: 'Q-1', summary: '', status: 'open' } as never,
        pos('dev-b', 2, 4),
        []
      )
    ).toEqual({ fromAnchor: 'right', toAnchor: 'left' });
  });
});
