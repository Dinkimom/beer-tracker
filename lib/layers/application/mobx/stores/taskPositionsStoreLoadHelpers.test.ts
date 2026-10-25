import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { mergeRemotePositions } from './taskPositionsStoreLoadHelpers';

function pos(taskId: string, startDay: number): TaskPosition {
  return { taskId, assignee: 'a', startDay, startPart: 0, duration: 1 };
}

describe('mergeRemotePositions', () => {
  it('takes remote positions when nothing is pending', () => {
    const next = mergeRemotePositions([pos('a', 1), pos('b', 2)], new Map(), new Map());
    expect([...next.keys()]).toEqual(['a', 'b']);
    expect(next.get('b')?.startDay).toBe(2);
  });

  it('keeps pending local edits over remote and strips __source', () => {
    const pending = new Map([
      ['a', { position: { ...pos('a', 5), __source: 'drag' } as TaskPosition }],
      ['c', { position: pos('c', 7) }],
    ]);
    const next = mergeRemotePositions([pos('a', 1), pos('b', 2)], pending, new Map());
    expect(next.get('a')?.startDay).toBe(5);
    expect(next.get('a')).not.toHaveProperty('__source');
    expect(next.get('c')?.startDay).toBe(7);
    expect(next.get('b')?.startDay).toBe(2);
  });

  it('lets plan drafts override both remote and pending', () => {
    const pending = new Map([['a', { position: pos('a', 5) }]]);
    const drafts = new Map([['a', pos('a', 9)], ['d', pos('d', 3)]]);
    const next = mergeRemotePositions([pos('a', 1)], pending, drafts);
    expect(next.get('a')?.startDay).toBe(9);
    expect(next.get('d')?.startDay).toBe(3);
  });

  it('drops positions that are absent remotely and not pending', () => {
    const next = mergeRemotePositions([], new Map(), new Map());
    expect(next.size).toBe(0);
  });
});
