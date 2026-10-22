import { describe, expect, it } from 'vitest';

import {
  insertSegmentGapAfter,
  listSegmentGapBlocks,
  listSegmentSplitPoints,
  moveSegmentGap,
  nearestSegmentSplitPoint,
  removeSegmentGapBlock,
  resizeSegmentGap,
  segmentEditWorkCellCount,
} from './segmentEditGapHelpers';

describe('listSegmentSplitPoints', () => {
  it('lists true|true boundaries', () => {
    expect(listSegmentSplitPoints([true, true, true])).toEqual([0, 1]);
    expect(listSegmentSplitPoints([true, false, true])).toEqual([]);
    expect(listSegmentSplitPoints([true])).toEqual([]);
  });
});

describe('listSegmentGapBlocks', () => {
  it('returns off blocks with start indices', () => {
    expect(listSegmentGapBlocks([true, true, false, false, true])).toEqual([
      { startIndex: 2, length: 2 },
    ]);
    expect(listSegmentGapBlocks([true, true, true])).toEqual([]);
  });
});

describe('insertSegmentGapAfter', () => {
  it('inserts a gap and preserves work cell count', () => {
    const input = [true, true, true, true];
    const next = insertSegmentGapAfter(input, 1, 10);
    expect(next).toEqual([true, true, false, true, true]);
    expect(segmentEditWorkCellCount(next!)).toBe(segmentEditWorkCellCount(input));
  });

  it('rejects invalid split or maxLength', () => {
    expect(insertSegmentGapAfter([true, false, true], 0, 10)).toBeNull();
    expect(insertSegmentGapAfter([true, true], 0, 2)).toBeNull();
    expect(insertSegmentGapAfter([true, true], 1, 10)).toBeNull();
  });
});

describe('removeSegmentGapBlock', () => {
  it('collapses the whole off block', () => {
    const input = [true, true, false, false, true];
    const next = removeSegmentGapBlock(input, 3);
    expect(next).toEqual([true, true, true]);
    expect(segmentEditWorkCellCount(next!)).toBe(segmentEditWorkCellCount(input));
  });

  it('rejects on-cell index', () => {
    expect(removeSegmentGapBlock([true, false, true], 0)).toBeNull();
  });
});

describe('resizeSegmentGap', () => {
  it('widens the gap and shifts the tail', () => {
    const input = [true, true, false, true];
    const next = resizeSegmentGap(input, 2, 3, 10);
    expect(next).toEqual([true, true, false, false, false, true]);
    expect(segmentEditWorkCellCount(next!)).toBe(segmentEditWorkCellCount(input));
  });

  it('narrows the gap down to minLength', () => {
    expect(resizeSegmentGap([true, false, false, false, true], 1, 0, 10)).toEqual([
      true,
      false,
      true,
    ]);
  });

  it('clamps to maxLength', () => {
    expect(resizeSegmentGap([true, false, true], 1, 10, 5)).toEqual([
      true,
      false,
      false,
      false,
      true,
    ]);
  });

  it('returns null when nothing changes or index is not a gap start', () => {
    expect(resizeSegmentGap([true, false, true], 1, 1, 10)).toBeNull();
    expect(resizeSegmentGap([true, false, false, true], 2, 3, 10)).toBeNull();
    expect(resizeSegmentGap([true, false, true], 0, 3, 10)).toBeNull();
  });
});

describe('moveSegmentGap', () => {
  it('moves the gap right, keeping one cell in the next segment', () => {
    const input = [true, false, true, true, true];
    expect(moveSegmentGap(input, 1, 1)).toEqual([true, true, false, true, true]);
    expect(moveSegmentGap(input, 1, 10)).toEqual([true, true, true, false, true]);
  });

  it('moves the gap left, keeping one cell in the previous segment', () => {
    const input = [true, true, true, false, false, true];
    expect(moveSegmentGap(input, 3, -10)).toEqual([true, false, false, true, true, true]);
  });

  it('returns null when the gap cannot move', () => {
    expect(moveSegmentGap([true, false, true], 1, 1)).toBeNull();
    expect(moveSegmentGap([true, false, true, true], 1, 0)).toBeNull();
  });
});

describe('nearestSegmentSplitPoint', () => {
  it('picks the closest boundary', () => {
    expect(nearestSegmentSplitPoint([0, 1, 2], 1.4)).toBe(0);
    expect(nearestSegmentSplitPoint([0, 1, 2], 2.6)).toBe(2);
    expect(nearestSegmentSplitPoint([], 1)).toBeNull();
  });

  it('ignores boundaries farther than maxDistance', () => {
    expect(nearestSegmentSplitPoint([0], 3, 1)).toBeNull();
    expect(nearestSegmentSplitPoint([0], 1.8, 1)).toBe(0);
  });
});
