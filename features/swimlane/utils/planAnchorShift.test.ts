import { describe, expect, it } from 'vitest';

import {
  planAnchorHatchStartFraction,
  resolvePlanAnchorDiff,
  resolvePlanAnchorFocusTaskId,
  resolveSegmentPlanAnchorOverlay,
} from './planAnchorShift';

const partsPerDay = 3;
const task = { id: 'T-1' };

function single(startDay: number, duration: number) {
  return { duration, segments: undefined, startDay, startPart: 0 };
}

describe('resolvePlanAnchorDiff', () => {
  it('is empty when the plan did not change', () => {
    expect(
      resolvePlanAnchorDiff({ anchor: single(1, 3), partsPerDay, position: single(1, 3), task })
    ).toBeNull();
  });

  it('reports a pure move as a deadline shift without cost change', () => {
    expect(
      resolvePlanAnchorDiff({ anchor: single(1, 3), partsPerDay, position: single(4, 3), task })
    ).toEqual({
      costDeltaCells: 0, currentEndCell: 15, currentStartCell: 12,
      deadlineCell: 6,
      startShiftCells: 9,
    });
  });

  it('reports cost growth and the shifted deadline', () => {
    expect(
      resolvePlanAnchorDiff({ anchor: single(3, 3), partsPerDay, position: single(3, 12), task })
    ).toEqual({
      costDeltaCells: 9, currentEndCell: 21, currentStartCell: 9,
      deadlineCell: 12,
      startShiftCells: 0,
    });
  });

  it('keeps a small re-estimate but drops a sub-day deadline shift', () => {
    expect(
      resolvePlanAnchorDiff({ anchor: single(1, 3), partsPerDay, position: single(1, 4), task })
    ).toEqual({
      costDeltaCells: 1, currentEndCell: 7, currentStartCell: 3,
      deadlineCell: null,
      startShiftCells: 0,
    });
  });

  it('reports a cost reduction with an earlier deadline', () => {
    expect(
      resolvePlanAnchorDiff({ anchor: single(0, 9), partsPerDay, position: single(0, 6), task })
    ).toEqual({
      costDeltaCells: -3, currentEndCell: 6, currentStartCell: 0,
      deadlineCell: 9,
      startShiftCells: 0,
    });
  });

  it('ignores notes and local drafts', () => {
    const anchor = single(1, 3);
    const position = single(4, 3);
    expect(
      resolvePlanAnchorDiff({ anchor, partsPerDay, position, task: { id: 'comment:1' } })
    ).toBeNull();
    expect(
      resolvePlanAnchorDiff({ anchor, partsPerDay, position, task: { id: 'T-2', isLocalTask: true } })
    ).toBeNull();
  });
});

describe('resolveSegmentPlanAnchorOverlay', () => {
  it('keeps the original cost within a single segment', () => {
    expect(
      resolveSegmentPlanAnchorOverlay({
        anchor: single(3, 3),
        partsPerDay,
        position: single(3, 12),
        segment: { duration: 12, startDay: 3, startPart: 0 },
        task,
      })
    ).toEqual({ baseCells: 3, moved: null });
  });

  it('spends the original cost on earlier segments first', () => {
    const position = {
      duration: 6,
      segments: [
        { duration: 3, startDay: 0, startPart: 0 },
        { duration: 3, startDay: 3, startPart: 0 },
      ],
      startDay: 0,
      startPart: 0,
    };
    const input = { anchor: single(0, 4), partsPerDay, position, task };
    expect(resolveSegmentPlanAnchorOverlay({ ...input, segment: position.segments[0] })).toEqual({
      baseCells: 4,
      moved: null,
    });
    expect(resolveSegmentPlanAnchorOverlay({ ...input, segment: position.segments[1] })).toEqual({
      baseCells: 1,
      moved: null,
    });
  });

  it('marks a move only on the first segment', () => {
    const position = {
      duration: 6,
      segments: [
        { duration: 3, startDay: 2, startPart: 0 },
        { duration: 3, startDay: 5, startPart: 0 },
      ],
      startDay: 2,
      startPart: 0,
    };
    const input = { anchor: single(0, 6), partsPerDay, position, task };
    expect(resolveSegmentPlanAnchorOverlay({ ...input, segment: position.segments[0] })?.moved).toBe(
      'later'
    );
    expect(resolveSegmentPlanAnchorOverlay({ ...input, segment: position.segments[1] })?.moved).toBeNull();
  });

  it('skips notes', () => {
    expect(
      resolveSegmentPlanAnchorOverlay({
        anchor: single(0, 3),
        partsPerDay,
        position: single(0, 6),
        segment: { duration: 6, startDay: 0, startPart: 0 },
        task: { id: 'comment:1' },
      })
    ).toBeNull();
  });
});

describe('planAnchorHatchStartFraction', () => {
  it('hatches the part beyond the original cost', () => {
    expect(planAnchorHatchStartFraction(3, 12)).toBe(0.25);
  });

  it('follows the live duration while resizing', () => {
    expect(planAnchorHatchStartFraction(3, 3)).toBeNull();
    expect(planAnchorHatchStartFraction(3, 6)).toBe(0.5);
  });

  it('hatches the whole segment when its original cost was spent earlier', () => {
    expect(planAnchorHatchStartFraction(-1, 3)).toBe(0);
  });
});

describe('resolvePlanAnchorFocusTaskId', () => {
  const base = {
    anchors: new Map([
      ['T-1', single(1, 3)],
      ['T-2', single(1, 3)],
      ['T-3', single(1, 3)],
    ]),
    partsPerDay,
    positions: new Map([
      ['T-1', single(4, 3)],
      ['T-2', single(1, 3)],
      ['T-3', single(1, 12)],
    ]),
    tasks: new Map([
      ['T-1', { id: 'T-1' }],
      ['T-2', { id: 'T-2' }],
      ['T-3', { id: 'T-3' }],
    ]),
  };

  it('focuses a hovered task whose plan moved', () => {
    expect(resolvePlanAnchorFocusTaskId({ ...base, hoveredTaskId: 'T-1' })).toBe('T-1');
  });

  it('ignores a hovered task that still matches its plan', () => {
    expect(resolvePlanAnchorFocusTaskId({ ...base, hoveredTaskId: 'T-2' })).toBeNull();
  });

  it('ignores a re-estimate that kept the start', () => {
    expect(resolvePlanAnchorFocusTaskId({ ...base, hoveredTaskId: 'T-3' })).toBeNull();
  });

  it('ignores the board without hover', () => {
    expect(resolvePlanAnchorFocusTaskId({ ...base, hoveredTaskId: null })).toBeNull();
  });
});
