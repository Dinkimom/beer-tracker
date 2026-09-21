import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { PARTS_PER_DAY } from '@/constants';

import {
  collectTimelineHoverLinkedTaskIds,
  isLinkInHoverConnectedComponent,
} from './collectTimelinePredecessorTaskIds';

function pos(startCell: number, endCell: number): TaskPosition {
  return {
    assignee: 'dev',
    duration: endCell - startCell,
    startDay: Math.floor(startCell / PARTS_PER_DAY),
    startPart: startCell % PARTS_PER_DAY,
    taskId: 't',
  };
}

describe('collectTimelineHoverLinkedTaskIds', () => {
  it('returns only the start when there are no links', () => {
    expect(collectTimelineHoverLinkedTaskIds('a', [])).toEqual(new Set(['a']));
  });

  it('includes all predecessors and only one hop forward', () => {
    const positions = new Map([
      ['a', pos(0, 2)],
      ['b', pos(4, 6)],
      ['c', pos(10, 12)],
      ['d', pos(14, 16)],
    ]);
    const links = [
      { fromTaskId: 'a', toTaskId: 'b' },
      { fromTaskId: 'b', toTaskId: 'c' },
      { fromTaskId: 'c', toTaskId: 'd' },
    ];
    expect(collectTimelineHoverLinkedTaskIds('c', links, positions)).toEqual(
      new Set(['a', 'b', 'c', 'd'])
    );
    expect(collectTimelineHoverLinkedTaskIds('b', links, positions)).toEqual(
      new Set(['a', 'b', 'c'])
    );
    expect(collectTimelineHoverLinkedTaskIds('a', links, positions)).toEqual(
      new Set(['a', 'b'])
    );
    expect(collectTimelineHoverLinkedTaskIds('d', links, positions)).toEqual(
      new Set(['a', 'b', 'c', 'd'])
    );
  });

  it('uses timeline order even when stored from→to is reversed', () => {
    const positions = new Map([
      ['a', pos(0, 2)],
      ['b', pos(4, 6)],
    ]);
    expect(
      collectTimelineHoverLinkedTaskIds(
        'b',
        [{ fromTaskId: 'b', toTaskId: 'a' }],
        positions
      )
    ).toEqual(new Set(['a', 'b']));
  });

  it('does not include a disjoint component', () => {
    const links = [
      { fromTaskId: 'a', toTaskId: 'b' },
      { fromTaskId: 'x', toTaskId: 'y' },
    ];
    expect(collectTimelineHoverLinkedTaskIds('a', links)).toEqual(new Set(['a', 'b']));
    expect(collectTimelineHoverLinkedTaskIds('b', links)).toEqual(new Set(['a', 'b']));
  });
});

describe('isLinkInHoverConnectedComponent', () => {
  it('is true only when both ends are in the linked set', () => {
    const connected = new Set(['a', 'b', 'c']);
    expect(
      isLinkInHoverConnectedComponent(connected, 'c', {
        fromTaskId: 'a',
        toTaskId: 'b',
      })
    ).toBe(true);
    expect(
      isLinkInHoverConnectedComponent(new Set(['a']), 'a', {
        fromTaskId: 'a',
        toTaskId: 'b',
      })
    ).toBe(false);
  });

  it('is false when there is no hovered task', () => {
    expect(
      isLinkInHoverConnectedComponent(new Set(['a', 'b']), null, {
        fromTaskId: 'a',
        toTaskId: 'b',
      })
    ).toBe(false);
  });
});
