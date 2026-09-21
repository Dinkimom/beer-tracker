import { describe, expect, it } from 'vitest';

import { areCellPositionsEqual } from './swimlaneDragCellUtils';

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
