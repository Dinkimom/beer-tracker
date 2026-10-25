import type { Task, TaskPosition } from '@/types';

import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_PLANNER_TIMELINE_SCALE,
  setActivePlannerTimelineScale,
} from '@/lib/plannerTimelineScale';

import { placeQaPhase, qaPhaseDurationSlots } from './qaTaskPlacement';

const TOTAL = 30; // 10 дней × 3 слота

function qa(partial: Partial<Task> = {}): Task {
  return {
    id: 'qa-1',
    link: '',
    name: '[QA] T',
    team: 'QA',
    assignee: 'qa-eng',
    storyPoints: 0,
    testPoints: 2,
    ...partial,
  };
}

function dev(partial: Partial<TaskPosition> = {}): TaskPosition {
  return { taskId: 'dev-1', assignee: 'dev', startDay: 0, startPart: 0, duration: 3, ...partial };
}

afterEach(() => {
  setActivePlannerTimelineScale(DEFAULT_PLANNER_TIMELINE_SCALE);
});

describe('qaPhaseDurationSlots', () => {
  it('converts test points through the active scale like story points', () => {
    expect(qaPhaseDurationSlots(qa({ testPoints: 8 }))).toBe(6);
    setActivePlannerTimelineScale({ estimateUnit: 'day', timeslotsPerDay: 3 });
    expect(qaPhaseDurationSlots(qa({ testPoints: 2 }))).toBe(6);
  });

  it('is at least one slot', () => {
    expect(qaPhaseDurationSlots(qa({ testPoints: 0 }))).toBe(1);
  });
});

describe('placeQaPhase', () => {
  it('starts right after the dev card with the scaled duration', () => {
    setActivePlannerTimelineScale({ estimateUnit: 'day', timeslotsPerDay: 3 });
    const position = placeQaPhase({ devPosition: dev(), laneIntervals: [], qaTask: qa(), totalCells: TOTAL });
    expect(position).toMatchObject({
      assignee: 'qa-eng',
      duration: 6,
      plannedDuration: 6,
      startDay: 1,
      startPart: 0,
      taskId: 'qa-1',
    });
  });

  it('starts after the last dev segment, not after start + summed duration', () => {
    const devPosition = dev({
      duration: 2,
      segments: [
        { startDay: 0, startPart: 0, duration: 1 },
        { startDay: 3, startPart: 0, duration: 1 },
      ],
    });
    const position = placeQaPhase({ devPosition, laneIntervals: [], qaTask: qa(), totalCells: TOTAL });
    expect(position?.startDay).toBe(3);
    expect(position?.startPart).toBe(1);
  });

  it('takes the first free gap in the QA lane after dev', () => {
    const laneIntervals = [
      { start: 3, end: 4 },
      { start: 6, end: 10 },
    ];
    // гап 4..6 вмещает 2 слота
    const position = placeQaPhase({ devPosition: dev(), laneIntervals, qaTask: qa(), totalCells: TOTAL });
    expect(position?.startDay).toBe(1);
    expect(position?.startPart).toBe(1);
  });

  it('skips a gap that is too short', () => {
    const laneIntervals = [
      { start: 3, end: 4 },
      { start: 5, end: 10 },
    ];
    const position = placeQaPhase({ devPosition: dev(), laneIntervals, qaTask: qa(), totalCells: TOTAL });
    expect((position?.startDay ?? 0) * 3 + (position?.startPart ?? 0)).toBe(10);
  });

  it('respects minStartCell (current sprint cell)', () => {
    const position = placeQaPhase({
      devPosition: dev(),
      laneIntervals: [],
      minStartCell: 12,
      qaTask: qa(),
      totalCells: TOTAL,
    });
    expect(position?.startDay).toBe(4);
  });

  it('returns null instead of clamping onto the sprint end', () => {
    expect(
      placeQaPhase({ devPosition: dev({ startDay: 9, duration: 2 }), laneIntervals: [], qaTask: qa(), totalCells: TOTAL })
    ).toBeNull();
    expect(
      placeQaPhase({
        devPosition: dev(),
        laneIntervals: [{ start: 3, end: 29 }],
        qaTask: qa(),
        totalCells: TOTAL,
      })
    ).toBeNull();
  });

  it('uses the real sprint length', () => {
    const devPosition = dev({ startDay: 9, duration: 3 });
    expect(placeQaPhase({ devPosition, laneIntervals: [], qaTask: qa(), totalCells: 30 })).toBeNull();
    expect(placeQaPhase({ devPosition, laneIntervals: [], qaTask: qa(), totalCells: 45 })?.startDay).toBe(10);
  });

  it('returns null without a QA assignee', () => {
    expect(
      placeQaPhase({ devPosition: dev(), laneIntervals: [], qaTask: qa({ assignee: undefined }), totalCells: TOTAL })
    ).toBeNull();
  });
});
