import { describe, expect, it } from 'vitest';

import { areCellPositionsEqual, isValidCell } from './swimlaneDragCellUtils';

describe('areCellPositionsEqual', () => {
  it('returns true for same reference', () => {
    const c = { assigneeId: 'a', day: 1, part: 2 };
    expect(areCellPositionsEqual(c, c)).toBe(true);
  });

  it('returns true for equal fields', () => {
    expect(
      areCellPositionsEqual(
        { assigneeId: 'x', day: 0, part: 1 },
        { assigneeId: 'x', day: 0, part: 1 }
      )
    ).toBe(true);
  });

  it('returns false when any field differs', () => {
    expect(
      areCellPositionsEqual(
        { assigneeId: 'x', day: 0, part: 1 },
        { assigneeId: 'x', day: 0, part: 2 }
      )
    ).toBe(false);
  });

  it('treats null only as equal to null', () => {
    expect(areCellPositionsEqual(null, null)).toBe(true);
    expect(areCellPositionsEqual(null, { assigneeId: 'a', day: 0, part: 0 })).toBe(false);
    expect(areCellPositionsEqual({ assigneeId: 'a', day: 0, part: 0 }, null)).toBe(false);
  });
});

describe('isValidCell', () => {
  it('rejects null', () => {
    expect(isValidCell(null, 10)).toBe(false);
  });

  it('accepts cells inside the sprint grid', () => {
    expect(isValidCell({ assigneeId: 'a', day: 0, part: 0 }, 10)).toBe(true);
    expect(isValidCell({ assigneeId: 'a', day: 9, part: 2 }, 10)).toBe(true);
  });

  it('rejects days outside the passed working-day count', () => {
    expect(isValidCell({ assigneeId: 'a', day: 10, part: 0 }, 10)).toBe(false);
    expect(isValidCell({ assigneeId: 'a', day: 12, part: 0 }, 15)).toBe(true);
    expect(isValidCell({ assigneeId: 'a', day: -1, part: 0 }, 10)).toBe(false);
  });

  it('rejects parts outside the day grid', () => {
    expect(isValidCell({ assigneeId: 'a', day: 0, part: 3 }, 10)).toBe(false);
    expect(isValidCell({ assigneeId: 'a', day: 0, part: -1 }, 10)).toBe(false);
  });

  it('treats a non-positive day count as a one-day sprint', () => {
    expect(isValidCell({ assigneeId: 'a', day: 0, part: 0 }, 0)).toBe(true);
    expect(isValidCell({ assigneeId: 'a', day: 1, part: 0 }, 0)).toBe(false);
  });
});
