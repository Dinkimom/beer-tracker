import { afterEach, describe, expect, it } from 'vitest';

import { storyPointsToTimeslots, timeslotsToStoryPoints } from '@/lib/pointsUtils';

import {
  DEFAULT_PLANNER_TIMELINE_SCALE,
  buildEstimateScalePreview,
  getActivePlannerTimelineScale,
  mergePlannerTimelineScale,
  partFitsPlannerGrid,
  plannerCoordinateShifts,
  presetPlannerTimelineSteps,
  readPlannerTimelineScale,
  resizeShouldPreserveEstimate,
  rescalePlannerTimelineSteps,
  scalePlannerDuration,
  scalePlannerSlot,
  setActivePlannerTimelineScale,
  storyPointsToTimeslotsForScale,
  timeslotsToStoryPointsForScale,
} from './plannerTimelineScale';

describe('planner timeline scale defaults', () => {
  afterEach(() => {
    setActivePlannerTimelineScale(DEFAULT_PLANNER_TIMELINE_SCALE);
  });

  it('keeps the historical slot ladder when the org has no planner settings', () => {
    expect(readPlannerTimelineScale(null)).toEqual(DEFAULT_PLANNER_TIMELINE_SCALE);
    expect(readPlannerTimelineScale({ planner: { estimateUnit: 'nope' } })).toEqual(
      DEFAULT_PLANNER_TIMELINE_SCALE
    );
    expect(timeslotsToStoryPoints(4)).toBe(5);
    expect(storyPointsToTimeslots(8)).toBe(6);
    expect(storyPointsToTimeslots(21)).toBe(10);
  });

  it('scales the same ladder by the day length', () => {
    const day = { estimateUnit: 'day' as const, timeslotsPerDay: 4 as const };
    expect(storyPointsToTimeslotsForScale(1, day)).toBe(4);
    expect(storyPointsToTimeslotsForScale(5, day)).toBe(20);
    expect(timeslotsToStoryPointsForScale(3, day)).toBe(0);
    expect(timeslotsToStoryPointsForScale(4, day)).toBe(1);
    expect(timeslotsToStoryPointsForScale(8, day)).toBe(2);
  });

  it('does not rewrite an estimate while an existing card is off the new scale', () => {
    const day = { estimateUnit: 'day' as const, timeslotsPerDay: 3 as const };
    expect(
      resizeShouldPreserveEstimate({
        currentEstimate: 3,
        previousDuration: 3,
        scale: DEFAULT_PLANNER_TIMELINE_SCALE,
      })
    ).toBe(false);
    expect(
      resizeShouldPreserveEstimate({ currentEstimate: 3, previousDuration: 3, scale: day })
    ).toBe(true);
    expect(
      resizeShouldPreserveEstimate({ currentEstimate: 1, previousDuration: 3, scale: day })
    ).toBe(false);
  });

  it('preserves whole days and rounds a mid-day third', () => {
    expect(scalePlannerDuration(3, 3, 4)).toBe(4);
    expect(scalePlannerDuration(3, 3, 2)).toBe(2);
    expect(scalePlannerSlot(0, 3, 2)).toBe(0);
    expect(scalePlannerSlot(1, 3, 2)).toBe(1);
    expect(plannerCoordinateShifts(0, 3, 3, 4)).toBe(false);
    expect(plannerCoordinateShifts(1, 1, 3, 2)).toBe(true);
  });

  it('merges planner settings without dropping sibling keys', () => {
    const next = mergePlannerTimelineScale(
      { sync: { enabled: true }, planner: { other: 1 } },
      { estimateUnit: 'day', timeslotsPerDay: 2 }
    );
    expect(next.sync).toEqual({ enabled: true });
    expect(next.planner).toEqual({ estimateUnit: 'day', other: 1, timeslotsPerDay: 2 });
  });

  it('starts the first custom step at the beginning of the scale', () => {
    const steps = presetPlannerTimelineSteps({ estimateUnit: 'day', timeslotsPerDay: 2 });
    expect(steps[0]).toEqual({ slots: 1, storyPoints: 1 });
    expect(steps[1]).toMatchObject({ slots: 4, storyPoints: 2 });
  });

  it('previews the day ladder in timeslots', () => {
    const rows = buildEstimateScalePreview({ estimateUnit: 'day', timeslotsPerDay: 2 });
    expect(rows.find((row) => row.storyPoints === 1)?.timeslots).toBe(2);
    expect(rows.find((row) => row.storyPoints === 21)?.timeslots).toBe(20);
  });

  it('rejects a part index outside the active grid', () => {
    expect(partFitsPlannerGrid(1, { estimateUnit: 'timeslot', timeslotsPerDay: 2 })).toBe(true);
    expect(partFitsPlannerGrid(2, { estimateUnit: 'timeslot', timeslotsPerDay: 2 })).toBe(false);
    expect(partFitsPlannerGrid(null, DEFAULT_PLANNER_TIMELINE_SCALE)).toBe(true);
  });

  it('lets each story-point value have its own length', () => {
    const scale = {
      estimateUnit: 'custom' as const,
      steps: [
        { slots: 2, storyPoints: 1 },
        { slots: 3, storyPoints: 2 },
        { slots: 4, storyPoints: 3 },
      ],
      timeslotsPerDay: 2 as const,
    };
    expect(storyPointsToTimeslotsForScale(1, scale)).toBe(2);
    expect(storyPointsToTimeslotsForScale(2, scale)).toBe(3);
    expect(storyPointsToTimeslotsForScale(3, scale)).toBe(4);
    expect(storyPointsToTimeslotsForScale(1, scale) * 2).not.toBe(storyPointsToTimeslotsForScale(2, scale));
    expect(storyPointsToTimeslotsForScale(4, scale)).toBe(4);
    expect(timeslotsToStoryPointsForScale(1, scale)).toBe(0);
    expect(timeslotsToStoryPointsForScale(2, scale)).toBe(1);
    expect(timeslotsToStoryPointsForScale(3, scale)).toBe(2);
    expect(timeslotsToStoryPointsForScale(5, scale)).toBe(3);
    const ranged = {
      estimateUnit: 'custom' as const,
      steps: [
        { slots: 4, storyPoints: 1, untilSlots: 5 },
        { slots: 8, storyPoints: 2, untilSlots: 10 },
      ],
      timeslotsPerDay: 4 as const,
    };
    expect(storyPointsToTimeslotsForScale(1, ranged)).toBe(4);
    expect(storyPointsToTimeslotsForScale(2, ranged)).toBe(8);
    expect(timeslotsToStoryPointsForScale(5, ranged)).toBe(1);
    expect(timeslotsToStoryPointsForScale(6, ranged)).toBe(2);
    expect(timeslotsToStoryPointsForScale(11, ranged)).toBe(2);
    expect(rescalePlannerTimelineSteps(scale.steps, 2, 4)).toEqual([
      { slots: 4, storyPoints: 1 },
      { slots: 6, storyPoints: 2 },
      { slots: 8, storyPoints: 3 },
    ]);
  });

  it('keeps a valid day grid when custom steps are missing', () => {
    expect(readPlannerTimelineScale({ planner: { estimateUnit: 'custom', timeslotsPerDay: 4 } })).toEqual({
      estimateUnit: 'timeslot',
      timeslotsPerDay: 4,
    });
  });

  it('stores custom steps and drops them when the preset returns', () => {
    const custom = {
      estimateUnit: 'custom' as const,
      steps: [
        { slots: 4, storyPoints: 1 },
        { slots: 6, storyPoints: 2 },
      ],
      timeslotsPerDay: 4 as const,
    };
    const merged = mergePlannerTimelineScale({ planner: { other: 1 } }, custom);
    expect(merged.planner).toEqual({ ...custom, other: 1 });
    const preset = mergePlannerTimelineScale(merged, { estimateUnit: 'day', timeslotsPerDay: 4 });
    expect(preset.planner).toEqual({ estimateUnit: 'day', other: 1, timeslotsPerDay: 4 });
  });

  it('applies the active scale to the shared converters', () => {
    setActivePlannerTimelineScale({ estimateUnit: 'day', timeslotsPerDay: 2 });
    expect(getActivePlannerTimelineScale().timeslotsPerDay).toBe(2);
    expect(storyPointsToTimeslots(1)).toBe(2);
    expect(timeslotsToStoryPoints(1)).toBe(0);
    expect(timeslotsToStoryPoints(2)).toBe(1);
  });
});
