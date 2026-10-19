import { describe, expect, it } from 'vitest';

import {
  insertSegmentGapAfter,
  listSegmentGapBlocks,
  listSegmentSplitPoints,
  removeSegmentGapBlock,
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
