import { describe, expect, it } from 'vitest';

import { clampSwimlaneStartCell, swimlaneCellFromStartCell } from './clampSwimlaneStartCell';

describe('clampSwimlaneStartCell', () => {
  it('keeps a start that already fits', () => {
    expect(clampSwimlaneStartCell(4, 2, 10)).toBe(4);
  });

  it('clamps to the rightmost start that still fits the duration', () => {
    expect(clampSwimlaneStartCell(9, 3, 10)).toBe(7);
  });

  it('clamps negative starts to 0', () => {
    expect(clampSwimlaneStartCell(-2, 1, 10)).toBe(0);
  });

  it('uses duration 1 when duration is invalid', () => {
    expect(clampSwimlaneStartCell(9, 0, 10)).toBe(9);
    expect(clampSwimlaneStartCell(9, Number.NaN, 10)).toBe(9);
  });

  it('returns 0 when the timeline is empty', () => {
    expect(clampSwimlaneStartCell(3, 2, 0)).toBe(0);
  });
});

describe('swimlaneCellFromStartCell', () => {
  it('splits start cell into day and part', () => {
    expect(swimlaneCellFromStartCell(7, 3)).toEqual({ day: 2, part: 1 });
  });
});
