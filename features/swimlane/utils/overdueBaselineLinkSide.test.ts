import type { Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { linkSharesOverdueBaselineSide } from './overdueBaselineLinkSide';

function pos(
  assignee: string,
  startDay: number,
  duration = 2,
  startPart = 0
): TaskPosition {
  return { assignee, duration, startDay, startPart, taskId: '' };
}

describe('linkSharesOverdueBaselineSide', () => {
  const sameRow = new Map<string, TaskPosition>([
    ['a', pos('u', 0)],
    ['b', pos('u', 2)],
  ]);
  const linkToTheRight = [{ fromTaskId: 'a', toTaskId: 'b' }];

  it('is true when the arrow leaves the right edge the baseline grows from', () => {
    expect(
      linkSharesOverdueBaselineSide({
        taskId: 'a',
        taskLinks: linkToTheRight,
        taskPositions: sameRow,
      })
    ).toBe(true);
  });

  it('is false when the arrow meets the card from the left', () => {
    expect(
      linkSharesOverdueBaselineSide({
        taskId: 'b',
        taskLinks: linkToTheRight,
        taskPositions: sameRow,
      })
    ).toBe(false);
  });

  it('is false when the arrow leaves the bottom toward the next row', () => {
    const positions = new Map<string, TaskPosition>([
      ['a', pos('u1', 0)],
      ['b', pos('u2', 0)],
    ]);
    expect(
      linkSharesOverdueBaselineSide({
        assigneeOrder: [{ id: 'u1' }, { id: 'u2' }],
        taskId: 'a',
        taskLinks: linkToTheRight,
        taskPositions: positions,
      })
    ).toBe(false);
  });

  it('is false when the arrow leaves the top toward the previous row', () => {
    const positions = new Map<string, TaskPosition>([
      ['a', pos('u2', 0)],
      ['b', pos('u1', 0)],
    ]);
    expect(
      linkSharesOverdueBaselineSide({
        assigneeOrder: [{ id: 'u1' }, { id: 'u2' }],
        taskId: 'a',
        taskLinks: [{ fromTaskId: 'a', toTaskId: 'b' }],
        taskPositions: positions,
      })
    ).toBe(false);
  });

  it('is false when a right-hand link ends before a later segment baseline', () => {
    const positions = new Map<string, TaskPosition>([
      [
        'a',
        {
          ...pos('u', 0, 4),
          segments: [
            { duration: 2, startDay: 0, startPart: 0 },
            { duration: 2, startDay: 2, startPart: 0 },
          ],
        },
      ],
      ['b', pos('u', 0, 2, 2)],
    ]);
    expect(
      linkSharesOverdueBaselineSide({
        taskId: 'a',
        taskLinks: linkToTheRight,
        taskPositions: positions,
      })
    ).toBe(false);
  });

  it('is true when a right-hand link crosses the baseline after the last segment', () => {
    const positions = new Map<string, TaskPosition>([
      [
        'a',
        {
          ...pos('u', 0, 4),
          segments: [
            { duration: 2, startDay: 0, startPart: 0 },
            { duration: 2, startDay: 2, startPart: 0 },
          ],
        },
      ],
      ['b', pos('u', 3)],
    ]);
    expect(
      linkSharesOverdueBaselineSide({
        taskId: 'a',
        taskLinks: linkToTheRight,
        taskPositions: positions,
      })
    ).toBe(true);
  });

  it('is false for a stacked card below on the same row', () => {
    const positions = new Map<string, TaskPosition>([
      ['a', pos('u', 0)],
      ['b', pos('u', 0)],
    ]);
    expect(
      linkSharesOverdueBaselineSide({
        taskId: 'a',
        taskLayerMap: new Map([
          ['a', 0],
          ['b', 1],
        ]),
        taskLinks: linkToTheRight,
        taskPositions: positions,
      })
    ).toBe(false);
  });

  it('ignores a user link when those arrows are hidden', () => {
    expect(
      linkSharesOverdueBaselineSide({
        taskId: 'a',
        taskLinks: linkToTheRight,
        taskPositions: sameRow,
        userLinksVisible: false,
      })
    ).toBe(false);
  });

  it('follows a dev-qa arrow on the right when user links are hidden', () => {
    const qaTasksMap = new Map<string, Task>([['a', { id: 'b' } as Task]]);
    expect(
      linkSharesOverdueBaselineSide({
        qaTasksMap,
        taskId: 'a',
        taskLinks: [],
        taskPositions: sameRow,
        userLinksVisible: false,
      })
    ).toBe(true);
    expect(
      linkSharesOverdueBaselineSide({
        qaTasksMap,
        taskId: 'b',
        taskLinks: [],
        taskPositions: sameRow,
        userLinksVisible: false,
      })
    ).toBe(false);
  });

  it('is false when the other end is not on the board', () => {
    expect(
      linkSharesOverdueBaselineSide({
        taskId: 'a',
        taskLinks: [{ fromTaskId: 'a', toTaskId: 'missing' }],
        taskPositions: sameRow,
      })
    ).toBe(false);
  });
});
