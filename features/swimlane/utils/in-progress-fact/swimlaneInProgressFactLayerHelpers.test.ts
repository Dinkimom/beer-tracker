import type { SegmentWithPhase } from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactLayerHelpers';
import type { SwimlaneInProgressFactSegment } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import type { StatusPhaseCell } from '@/lib/planner-timeline';

import { describe, expect, it } from 'vitest';

import { PARTS_PER_DAY } from '@/constants';
import { buildArrowPairsForSameTask } from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactArrowHelpers';
import {
  buildLanes,
  buildWithPhases,
  factTimelineHolidayMask,
  getVisibleSwimlaneFactLayerHeightPx,
  hexToRgbaArrow,
  isClosedFactPhase,
  swimlaneFactBarElementId,
} from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactLayerHelpers';
import {
  getSwimlaneInProgressFactLayerHeightFromLaneCount,
  getSwimlaneInProgressFactLayerHeightPx,
} from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';

const DEFAULT_PHASE_CELL: StatusPhaseCell = {
  durationMs: 0,
  endCell: 0,
  endTime: null,
  startCell: 0,
  startTime: '',
  statusKey: 'inProgress',
  statusName: '',
};

const DEFAULT_SEG: SwimlaneInProgressFactSegment = {
  durationMs: 0,
  endTime: null,
  endTimeMs: 0,
  laneIndex: 0,
  startTime: '',
  startTimeMs: 0,
  statusKey: 'inProgress',
  statusName: '',
  taskId: '',
};

function phaseCell(partial: Partial<StatusPhaseCell> & Pick<StatusPhaseCell, 'endCell' | 'startCell'>): StatusPhaseCell {
  return { ...DEFAULT_PHASE_CELL, ...partial };
}

function segBase(
  partial: Partial<SwimlaneInProgressFactSegment> &
    Pick<SwimlaneInProgressFactSegment, 'endTimeMs' | 'laneIndex' | 'startTimeMs' | 'taskId'>
): SwimlaneInProgressFactSegment {
  return { ...DEFAULT_SEG, ...partial };
}

function item(phase: StatusPhaseCell, seg: SwimlaneInProgressFactSegment): SegmentWithPhase {
  return { phase, seg };
}

describe('isClosedFactPhase', () => {
  it('returns true for closed status (case/spaces)', () => {
    expect(isClosedFactPhase(phaseCell({ statusKey: 'Closed', startCell: 0, endCell: 1 }))).toBe(true);
    expect(isClosedFactPhase(phaseCell({ statusKey: ' closed ', startCell: 0, endCell: 1 }))).toBe(true);
  });

  it('returns false for other statuses', () => {
    expect(isClosedFactPhase(phaseCell({ statusKey: 'inProgress', startCell: 0, endCell: 1 }))).toBe(false);
  });
});

describe('swimlaneFactBarElementId', () => {
  it('builds stable id from layer and segment times', () => {
    expect(
      swimlaneFactBarElementId('row-1', {
        endTimeMs: 2,
        startTimeMs: 1,
        taskId: 't1',
      })
    ).toBe('factbar_row-1_t1_1_2');
  });

  it('sanitizes layer id to allowed chars', () => {
    expect(
      swimlaneFactBarElementId('a/b:c', {
        endTimeMs: 0,
        startTimeMs: 0,
        taskId: 't',
      })
    ).toMatch(/^factbar_a_b_c_t_0_0$/);
  });
});

describe('hexToRgbaArrow', () => {
  it('converts #RRGGBB to rgba', () => {
    expect(hexToRgbaArrow('#ff8040', 0.55)).toBe('rgba(255, 128, 64, 0.55)');
  });

  it('returns input when not a hex color', () => {
    expect(hexToRgbaArrow('red', 0.5)).toBe('red');
  });
});

describe('buildArrowPairsForSameTask', () => {
  it('returns empty when fewer than two segments per task', () => {
    const s = segBase({ taskId: 'a', laneIndex: 0, startTimeMs: 1, endTimeMs: 2 });
    const p = phaseCell({ startCell: 0, endCell: 1 });
    expect(buildArrowPairsForSameTask([item(p, s)], 'L')).toEqual([]);
  });

  it('links consecutive segments of same task by start time', () => {
    const s1 = segBase({ taskId: 'a', laneIndex: 0, startTimeMs: 10, endTimeMs: 20 });
    const s2 = segBase({ taskId: 'a', laneIndex: 0, startTimeMs: 5, endTimeMs: 8 });
    const s3 = segBase({ taskId: 'a', laneIndex: 0, startTimeMs: 30, endTimeMs: 40 });
    const p1 = phaseCell({ startCell: 1, endCell: 2 });
    const p2 = phaseCell({ startCell: 0, endCell: 1 });
    const p3 = phaseCell({ startCell: 3, endCell: 4 });
    const pairs = buildArrowPairsForSameTask(
      [item(p1, s1), item(p2, s2), item(p3, s3)],
      'L'
    );
    expect(pairs).toHaveLength(2);
    expect(pairs[0]!.from).toBe(swimlaneFactBarElementId('L', s2));
    expect(pairs[0]!.to).toBe(swimlaneFactBarElementId('L', s1));
    expect(pairs[1]!.from).toBe(swimlaneFactBarElementId('L', s1));
    expect(pairs[1]!.to).toBe(swimlaneFactBarElementId('L', s3));
  });

  it('does not pair different tasks', () => {
    const s1 = segBase({ taskId: 'a', laneIndex: 0, startTimeMs: 1, endTimeMs: 2 });
    const s2 = segBase({ taskId: 'b', laneIndex: 0, startTimeMs: 3, endTimeMs: 4 });
    const p = phaseCell({ startCell: 0, endCell: 1 });
    expect(buildArrowPairsForSameTask([item(p, s1), item(p, s2)], 'L')).toEqual([]);
  });
});

describe('buildLanes', () => {
  it('returns empty for empty input', () => {
    expect(buildLanes([])).toEqual([]);
  });

  it('groups by laneIndex and sorts lanes by earliest startCell', () => {
    const s0 = segBase({ taskId: 'a', laneIndex: 0, startTimeMs: 1, endTimeMs: 2 });
    const s1 = segBase({ taskId: 'b', laneIndex: 1, startTimeMs: 1, endTimeMs: 2 });
    const pLate = phaseCell({ startCell: 5, endCell: 6 });
    const pEarly = phaseCell({ startCell: 1, endCell: 2 });
    const lanes = buildLanes([
      item(pLate, s0),
      item(pEarly, s1),
    ]);
    expect(lanes).toHaveLength(2);
    expect(lanes[0]![0]!.phase.startCell).toBe(1);
    expect(lanes[1]![0]!.phase.startCell).toBe(5);
  });

  it('sorts items within lane by startCell', () => {
    const s1 = segBase({ taskId: 'a', laneIndex: 0, startTimeMs: 1, endTimeMs: 2 });
    const s2 = segBase({ taskId: 'b', laneIndex: 0, startTimeMs: 3, endTimeMs: 4 });
    const p2 = phaseCell({ startCell: 4, endCell: 5 });
    const p1 = phaseCell({ startCell: 1, endCell: 2 });
    const lanes = buildLanes([item(p2, s2), item(p1, s1)]);
    expect(lanes).toHaveLength(1);
    expect(lanes[0]!.map((x) => x.phase.startCell)).toEqual([1, 4]);
  });
});

describe('buildWithPhases', () => {
  /** Пн 10 марта 2025 */
  const sprintStart = new Date(2025, 2, 10);
  const fiveDayParts = 5 * PARTS_PER_DAY;

  function segmentOnDay(dayOffset: number, taskId = 't1'): SwimlaneInProgressFactSegment {
    const start = new Date(2025, 2, 10 + dayOffset, 9, 0, 0);
    const end = new Date(2025, 2, 10 + dayOffset, 12, 0, 0);
    return segBase({
      endTime: end.toISOString(),
      endTimeMs: end.getTime(),
      laneIndex: 0,
      startTime: start.toISOString(),
      startTimeMs: start.getTime(),
      taskId,
    });
  }

  it('maps a phase on day 2 into the 5-day timeline (cells 0..15)', () => {
    const nowCell = fiveDayParts;
    const result = buildWithPhases(
      [segmentOnDay(2)],
      sprintStart,
      nowCell,
      0,
      fiveDayParts
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.phase.startCell).toBeCloseTo(2 * PARTS_PER_DAY, 5);
    expect(result[0]!.phase.endCell).toBeCloseTo(2 * PARTS_PER_DAY + 1, 5);
    expect(result[0]!.phase.endCell).toBeLessThanOrEqual(fiveDayParts);
  });

  it('clamps to 5 working days: phase after Friday is outside the cap', () => {
    // След. понедельник (день 7 календаря) — уже за пределами 5-дневного спринта
    const nextMondayStart = new Date(2025, 2, 17, 9, 0, 0);
    const nextMondayEnd = new Date(2025, 2, 17, 12, 0, 0);
    const seg = segBase({
      endTime: nextMondayEnd.toISOString(),
      endTimeMs: nextMondayEnd.getTime(),
      laneIndex: 0,
      startTime: nextMondayStart.toISOString(),
      startTimeMs: nextMondayStart.getTime(),
      taskId: 't1',
    });
    const result = buildWithPhases([seg], sprintStart, fiveDayParts, 0, fiveDayParts);
    expect(result).toHaveLength(0);
  });

  it('with wrong 10-day cap, a next-week phase would incorrectly get a cell', () => {
    const tenDayParts = 10 * PARTS_PER_DAY;
    const nextMondayStart = new Date(2025, 2, 17, 9, 0, 0);
    const nextMondayEnd = new Date(2025, 2, 17, 12, 0, 0);
    const seg = segBase({
      endTime: nextMondayEnd.toISOString(),
      endTimeMs: nextMondayEnd.getTime(),
      laneIndex: 0,
      startTime: nextMondayStart.toISOString(),
      startTimeMs: nextMondayStart.getTime(),
      taskId: 't1',
    });
    const result = buildWithPhases([seg], sprintStart, tenDayParts, 0, tenDayParts);
    expect(result).toHaveLength(1);
    expect(result[0]!.phase.startCell).toBeCloseTo(5 * PARTS_PER_DAY, 5);
  });
});

describe('getVisibleSwimlaneFactLayerHeightPx', () => {
  /** Пн 10 марта 2025 */
  const sprintStart = new Date(2025, 2, 10);
  const fiveDayParts = 5 * PARTS_PER_DAY;
  const noonOnDay2 = new Date(2025, 2, 12, 12, 0, 0).getTime();

  it('returns 0 when all phases are outside the sprint timeline', () => {
    const nextMondayStart = new Date(2025, 2, 17, 9, 0, 0);
    const nextMondayEnd = new Date(2025, 2, 17, 12, 0, 0);
    const seg = segBase({
      endTime: nextMondayEnd.toISOString(),
      endTimeMs: nextMondayEnd.getTime(),
      laneIndex: 0,
      startTime: nextMondayStart.toISOString(),
      startTimeMs: nextMondayStart.getTime(),
      taskId: 't1',
    });

    expect(
      getVisibleSwimlaneFactLayerHeightPx([seg], sprintStart, fiveDayParts, noonOnDay2)
    ).toBe(0);
  });

  it('uses visible lane count, not raw max laneIndex from filtered segments', () => {
    const visibleStart = new Date(2025, 2, 11, 9, 0, 0);
    const visibleEnd = new Date(2025, 2, 11, 12, 0, 0);
    const outsideStart = new Date(2025, 2, 17, 9, 0, 0);
    const outsideEnd = new Date(2025, 2, 17, 12, 0, 0);
    const visible = segBase({
      endTime: visibleEnd.toISOString(),
      endTimeMs: visibleEnd.getTime(),
      laneIndex: 0,
      startTime: visibleStart.toISOString(),
      startTimeMs: visibleStart.getTime(),
      taskId: 'visible',
    });
    const hidden = segBase({
      endTime: outsideEnd.toISOString(),
      endTimeMs: outsideEnd.getTime(),
      laneIndex: 1,
      startTime: outsideStart.toISOString(),
      startTimeMs: outsideStart.getTime(),
      taskId: 'hidden',
    });

    const segments = [visible, hidden];
    expect(getSwimlaneInProgressFactLayerHeightPx(segments)).toBe(
      getSwimlaneInProgressFactLayerHeightFromLaneCount(2)
    );
    expect(getVisibleSwimlaneFactLayerHeightPx(segments, sprintStart, fiveDayParts, noonOnDay2)).toBe(
      getSwimlaneInProgressFactLayerHeightFromLaneCount(1)
    );
  });
});

describe('factTimelineHolidayMask', () => {
  it('returns nothing when there is no day off', () => {
    expect(factTimelineHolidayMask(undefined, 30, 3)).toBeUndefined();
    expect(factTimelineHolidayMask(new Set(), 30, 3)).toBeUndefined();
  });

  it('cuts a hard window over each day off and turns opaque again at its edge', () => {
    expect(factTimelineHolidayMask(new Set([1]), 30, 3)).toBe(
      'linear-gradient(to right, #000 0%, #000 10.0000%, transparent 10.0000%, transparent 20.0000%, #000 20.0000%, #000 100%)'
    );
  });
});
