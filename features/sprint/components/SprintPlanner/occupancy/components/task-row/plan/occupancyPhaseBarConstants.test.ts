import { describe, expect, it } from 'vitest';

import { PARTS_PER_DAY } from '@/constants';

import { cellToPosition, cellsToPositionDayMode, TOTAL_PARTS } from './occupancyPhaseBarConstants';

describe('TOTAL_PARTS', () => {
  it('matches working days × parts per day', () => {
    expect(TOTAL_PARTS).toBe(10 * PARTS_PER_DAY);
  });
});

describe('cellToPosition', () => {
  it('maps cell index to day and intraday part', () => {
    expect(cellToPosition(0)).toEqual({ startDay: 0, startPart: 0 });
    expect(cellToPosition(PARTS_PER_DAY - 1)).toEqual({ startDay: 0, startPart: PARTS_PER_DAY - 1 });
    expect(cellToPosition(PARTS_PER_DAY)).toEqual({ startDay: 1, startPart: 0 });
    expect(cellToPosition(PARTS_PER_DAY + 1)).toEqual({ startDay: 1, startPart: 1 });
  });
});

describe('cellsToPositionDayMode', () => {
  it('treats each cell as a full day in part units', () => {
    expect(cellsToPositionDayMode(0, 1)).toEqual({
      duration: PARTS_PER_DAY,
      startDay: 0,
      startPart: 0,
    });
    expect(cellsToPositionDayMode(2, 3)).toEqual({
      duration: 3 * PARTS_PER_DAY,
      startDay: 2,
      startPart: 0,
    });
  });
});
