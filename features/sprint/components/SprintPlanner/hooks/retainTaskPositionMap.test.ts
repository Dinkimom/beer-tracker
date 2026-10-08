import { describe, expect, it } from 'vitest';

import { retainTaskPositionMap, taskPositionMapsHaveSameEntries } from './retainTaskPositionMap';

const pos = (
  taskId: string,
  overrides?: Partial<{ assignee: string; duration: number; startDay: number; startPart: number }>
): {
  assignee: string;
  duration: number;
  startDay: number;
  startPart: number;
  taskId: string;
} => ({
  assignee: 'dev-a',
  duration: 2,
  startDay: 0,
  startPart: 0,
  taskId,
  ...overrides,
});

describe('retainTaskPositionMap', () => {
  it('keeps the previous map when entry references are unchanged', () => {
    const first = pos('BT-1');
    const previous = new Map([['BT-1', first]]);
    const next = new Map([['BT-1', first]]);
    expect(taskPositionMapsHaveSameEntries(previous, next)).toBe(true);
    expect(retainTaskPositionMap(previous, next)).toBe(previous);
  });

  it('keeps the previous map when geometry matches even if objects are new', () => {
    const previous = new Map([['BT-1', pos('BT-1')]]);
    const next = new Map([['BT-1', pos('BT-1')]]);
    expect(retainTaskPositionMap(previous, next)).toBe(previous);
  });

  it('replaces the map when geometry changes', () => {
    const previous = new Map([['BT-1', pos('BT-1')]]);
    const next = new Map([['BT-1', pos('BT-1', { startDay: 2 })]]);
    expect(retainTaskPositionMap(previous, next)).toBe(next);
  });
});
