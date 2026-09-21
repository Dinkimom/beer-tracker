import type { PhaseSegment, Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  cellsToSegments,
  getCombinedPhaseCellRange,
  phaseSegmentCellsDirty,
  getDayDate,
  getPlannedPositionDateRange,
  getPhaseSegmentCellBlocks,
  getPositionEffectiveDuration,
  getPositionSegmentRanges,
  getSegmentEditorRangeAndCells,
  isCellOccupiedByTask,
  mergeAdjacentSegments,
  occupancyPlanEndCell,
  positionToEndCell,
  positionToStartCell,
  withMergedPlanSegments,
} from './occupancyUtils';

function position(
  overrides: Partial<TaskPosition> & Pick<TaskPosition, 'assignee' | 'taskId'>
): TaskPosition {
  return {
    duration: 1,
    startDay: 0,
    startPart: 0,
    ...overrides,
  };
}

function task(partial: Partial<Task> & { id: string }): Task {
  return {
    link: '',
    name: 't',
    team: 'Web',
    ...partial,
  };
}

describe('cellsToSegments', () => {
  it('returns empty array when all cells are false', () => {
    expect(cellsToSegments(0, [false, false])).toEqual([]);
  });

  it('maps contiguous true cells to one segment with startCell offset', () => {
    expect(cellsToSegments(0, [true, true, false, true])).toEqual([
      { startDay: 0, startPart: 0, duration: 2 },
      { startDay: 1, startPart: 0, duration: 1 },
    ]);
  });

  it('respects startCell when converting to day/part (PARTS_PER_DAY)', () => {
    // startCell=2 -> day 0 part 2; two true -> duration 2 spans into day 1
    expect(cellsToSegments(2, [true, true])).toEqual([
      { startDay: 0, startPart: 2, duration: 2 },
    ]);
  });
});

describe('phaseSegmentCellsDirty', () => {
  it('returns false when arrays match', () => {
    expect(phaseSegmentCellsDirty([true, false], [true, false])).toBe(false);
    expect(phaseSegmentCellsDirty([], [])).toBe(false);
  });

  it('returns true when lengths differ or any cell differs', () => {
    expect(phaseSegmentCellsDirty([true], [true, false])).toBe(true);
    expect(phaseSegmentCellsDirty([false], [true])).toBe(true);
  });
});

describe('getPhaseSegmentCellBlocks', () => {
  it('groups alternating on/off runs', () => {
    expect(getPhaseSegmentCellBlocks([true, false, true])).toEqual([
      { type: 'on', length: 1 },
      { type: 'off', length: 1 },
      { type: 'on', length: 1 },
    ]);
  });

  it('handles empty array', () => {
    expect(getPhaseSegmentCellBlocks([])).toEqual([]);
  });
});

describe('mergeAdjacentSegments', () => {
  it('returns empty or single unchanged', () => {
    expect(mergeAdjacentSegments([])).toEqual([]);
    const one: PhaseSegment[] = [{ startDay: 0, startPart: 1, duration: 2 }];
    expect(mergeAdjacentSegments(one)).toEqual(one);
  });

  it('merges overlapping and touching segments after sort', () => {
    const input: PhaseSegment[] = [
      { startDay: 0, startPart: 2, duration: 1 },
      { startDay: 0, startPart: 0, duration: 2 },
    ];
    expect(mergeAdjacentSegments(input)).toEqual([{ startDay: 0, startPart: 0, duration: 3 }]);
  });

  it('keeps disjoint segments separate', () => {
    const input: PhaseSegment[] = [
      { startDay: 0, startPart: 0, duration: 1 },
      { startDay: 2, startPart: 0, duration: 1 },
    ];
    expect(mergeAdjacentSegments(input)).toEqual(input);
  });
});

describe('getPositionSegmentRanges', () => {
  it('uses single block when segments absent or empty', () => {
    const p = position({ taskId: 'a', assignee: 'x', startDay: 1, startPart: 1, duration: 2 });
    expect(getPositionSegmentRanges(p)).toEqual([{ startCell: 4, endCell: 6 }]);
    expect(getPositionSegmentRanges({ ...p, segments: [] })).toEqual([{ startCell: 4, endCell: 6 }]);
  });

  it('maps each segment to cell ranges', () => {
    const p = position({
      taskId: 'a',
      assignee: 'x',
      startDay: 0,
      startPart: 0,
      duration: 9,
      segments: [
        { startDay: 0, startPart: 0, duration: 1 },
        { startDay: 1, startPart: 0, duration: 2 },
      ],
    });
    expect(getPositionSegmentRanges(p)).toEqual([
      { startCell: 0, endCell: 1 },
      { startCell: 3, endCell: 5 },
    ]);
  });
});

describe('getPositionEffectiveDuration', () => {
  it('sums segment durations when segments present', () => {
    const p = position({
      taskId: 'a',
      assignee: 'x',
      duration: 99,
      segments: [
        { startDay: 0, startPart: 0, duration: 2 },
        { startDay: 1, startPart: 0, duration: 3 },
      ],
    });
    expect(getPositionEffectiveDuration(p)).toBe(5);
  });

  it('uses root duration when no segments', () => {
    expect(
      getPositionEffectiveDuration(position({ taskId: 'a', assignee: 'x', duration: 7 }))
    ).toBe(7);
  });
});

describe('getSegmentEditorRangeAndCells', () => {
  it('builds boolean grid spanning min..max segment range', () => {
    const p = position({
      taskId: 'a',
      assignee: 'x',
      duration: 9,
      segments: [
        { startDay: 0, startPart: 0, duration: 1 },
        { startDay: 0, startPart: 2, duration: 1 },
      ],
    });
    const { rangeStartCell, totalCells, initialCells } = getSegmentEditorRangeAndCells(p);
    expect(rangeStartCell).toBe(0);
    expect(totalCells).toBe(3);
    expect(initialCells).toEqual([true, false, true]);
  });
});

describe('getDayDate', () => {
  it('adds dayIndex for first five working indices', () => {
    const monday = new Date(2025, 0, 6);
    expect(getDayDate(monday, 0).getDate()).toBe(6);
    expect(getDayDate(monday, 4).getDate()).toBe(10);
  });

  it('skips weekend when dayIndex >= 5', () => {
    const monday = new Date(2025, 0, 6);
    // day 5 uses sprintStart + 5 + 2 + 0 = +7 calendar days from Jan 6 -> Jan 13
    expect(getDayDate(monday, 5).getDate()).toBe(13);
  });
});

describe('getPlannedPositionDateRange', () => {
  it('returns null when plannedStartDay or plannedStartPart missing', () => {
    const sprintStart = new Date(2025, 0, 6);
    expect(
      getPlannedPositionDateRange({ duration: 3, plannedStartDay: null, plannedStartPart: 0 }, sprintStart, 10)
    ).toBeNull();
    expect(
      getPlannedPositionDateRange({ duration: 3, plannedStartDay: 0, plannedStartPart: null }, sprintStart, 10)
    ).toBeNull();
  });

  it('respects plannedStartPart when computing inclusive end day', () => {
    const sprintStart = new Date(2025, 0, 6); // Monday
    // start: day 0, part 1; duration 2 => last cell: 0*3+1 +2-1 = 2 => still day 0
    const range = getPlannedPositionDateRange(
      { duration: 2, plannedStartDay: 0, plannedStartPart: 1, plannedDuration: 2 },
      sprintStart,
      10
    );
    expect(range?.startDate.getDate()).toBe(6);
    expect(range?.endDate.getDate()).toBe(6);

    // start: day 0, part 2; duration 2 => last cell: 0*3+2 +2-1 = 3 => day 1
    const range2 = getPlannedPositionDateRange(
      { duration: 2, plannedStartDay: 0, plannedStartPart: 2, plannedDuration: 2 },
      sprintStart,
      10
    );
    expect(range2?.startDate.getDate()).toBe(6);
    expect(range2?.endDate.getDate()).toBe(7);
  });

  it('skips weekend when computing end day index', () => {
    const sprintStart = new Date(2025, 0, 6); // Jan 6, 2025 (Monday)
    // day 4 is Friday (Jan 10). part 2 (last part). duration 2 => spills into next working day:
    // start cell=4*3+2=14; last cell=14+2-1=15; endDayIndex=floor(15/3)=5 => next Monday Jan 13
    const range = getPlannedPositionDateRange(
      { duration: 2, plannedStartDay: 4, plannedStartPart: 2, plannedDuration: 2 },
      sprintStart,
      10
    );
    expect(range?.startDate.getDate()).toBe(10);
    expect(range?.endDate.getDate()).toBe(13);
  });

  it('uses segment span when phase is split into segments', () => {
    const sprintStart = new Date(2025, 0, 6); // Monday
    const range = getPlannedPositionDateRange(
      {
        duration: 1,
        plannedStartDay: 0,
        plannedStartPart: 0,
        plannedDuration: 1,
        segments: [
          { duration: 1, startDay: 0, startPart: 2 },
          { duration: 1, startDay: 2, startPart: 0 },
        ],
      },
      sprintStart,
      10
    );

    expect(range?.startDate.getDate()).toBe(6);
    expect(range?.endDate.getDate()).toBe(8);
  });
});

describe('isCellOccupiedByTask', () => {
  it('with cellsPerDay 1 uses day span from ceil(duration / PARTS_PER_DAY)', () => {
    const p = position({ taskId: 'a', assignee: 'x', startDay: 0, startPart: 0, duration: 4 });
    expect(isCellOccupiedByTask(0, 0, p, 1)).toBe(true);
    expect(isCellOccupiedByTask(1, 0, p, 1)).toBe(true);
    expect(isCellOccupiedByTask(2, 0, p, 1)).toBe(false);
  });

  it('with default grid uses segment ranges', () => {
    const p = position({
      taskId: 'a',
      assignee: 'x',
      duration: 9,
      segments: [{ startDay: 0, startPart: 1, duration: 1 }],
    });
    expect(isCellOccupiedByTask(0, 0, p)).toBe(false);
    expect(isCellOccupiedByTask(0, 1, p)).toBe(true);
  });
});

describe('positionToStartCell / positionToEndCell', () => {
  it('returns min/max over segment ranges', () => {
    const p = position({
      taskId: 'a',
      assignee: 'x',
      duration: 9,
      segments: [
        { startDay: 1, startPart: 0, duration: 1 },
        { startDay: 0, startPart: 2, duration: 1 },
      ],
    });
    expect(positionToStartCell(p)).toBe(2);
    expect(positionToEndCell(p)).toBe(4);
  });
});

describe('occupancyPlanEndCell', () => {
  it('uses planned fields when no segments', () => {
    const p = position({
      taskId: 'a',
      assignee: 'x',
      startDay: 2,
      startPart: 0,
      duration: 1,
      plannedStartDay: 0,
      plannedStartPart: 0,
      plannedDuration: 6,
    });
    expect(occupancyPlanEndCell(p)).toBe(6);
  });

  it('matches end of segments when segments set', () => {
    const p = position({
      taskId: 'a',
      assignee: 'x',
      duration: 9,
      segments: [
        { startDay: 0, startPart: 0, duration: 1 },
        { startDay: 2, startPart: 0, duration: 1 },
      ],
    });
    expect(occupancyPlanEndCell(p)).toBe(positionToEndCell(p));
  });
});

describe('getCombinedPhaseCellRange', () => {
  it('returns null when neither dev nor qa range exists', () => {
    expect(getCombinedPhaseCellRange(undefined, undefined, null)).toBeNull();
  });

  it('returns dev-only span', () => {
    const p = position({ taskId: 'a', assignee: 'd', startDay: 0, startPart: 0, duration: 3 });
    expect(getCombinedPhaseCellRange(p, undefined, null)).toEqual({ startCell: 0, endCell: 3 });
  });

  it('combines dev and qa when qaTask is set', () => {
    const dev = position({ taskId: 't1', assignee: 'd', startDay: 0, startPart: 0, duration: 3 });
    const qa = position({ taskId: 't1-qa', assignee: 'q', startDay: 1, startPart: 0, duration: 3 });
    const qaT = task({ id: 't1-qa' });
    expect(getCombinedPhaseCellRange(dev, qa, qaT)).toEqual({ startCell: 0, endCell: 6 });
  });
});

describe('withMergedPlanSegments', () => {
  it('moves envelope start to the first segment so left-resize does not look like right-resize', () => {
    const p = position({
      taskId: 'a',
      assignee: 'x',
      startDay: 2,
      startPart: 1,
      duration: 6,
    });
    expect(
      withMergedPlanSegments(p, [
        { startDay: 1, startPart: 2, duration: 4 },
        { startDay: 3, startPart: 0, duration: 2 },
      ])
    ).toMatchObject({
      startDay: 1,
      startPart: 2,
      plannedStartDay: 1,
      plannedStartPart: 2,
      duration: 6,
    });
  });
});
