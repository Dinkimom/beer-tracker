import { describe, expect, it } from 'vitest';

import {
  cardWidthPxForDurationParts,
  resolveHoverExpandFitDurationParts,
  resolveHoverExpandTargetDurationParts,
  TASK_BAR_HOVER_EXPAND_MAX_DURATION_PARTS,
} from './taskBarHoverExpandFit';

const timeline = {
  timelineTotalParts: 10,
  timelineWidthPx: 1000,
};

describe('resolveHoverExpandTargetDurationParts', () => {
  it('caps a measured fit at four timeslots', () => {
    expect(
      resolveHoverExpandTargetDurationParts({
        currentDurationParts: 1,
        measuredFitDurationParts: 9,
      })
    ).toBe(TASK_BAR_HOVER_EXPAND_MAX_DURATION_PARTS);
  });

  it('does not shrink a card that is already wider than four timeslots', () => {
    expect(
      resolveHoverExpandTargetDurationParts({
        currentDurationParts: 5,
        measuredFitDurationParts: 2,
      })
    ).toBe(5);
  });

  it('falls back to four timeslots when the text width was not measured', () => {
    expect(
      resolveHoverExpandTargetDurationParts({
        currentDurationParts: 1,
        measuredFitDurationParts: null,
      })
    ).toBe(4);
  });
});

describe('resolveHoverExpandFitDurationParts', () => {
  const currentDurationParts = 1;
  const currentCardWidthPx = cardWidthPxForDurationParts({
    durationParts: currentDurationParts,
    ...timeline,
  });

  it('grows only enough for the text and stays under four timeslots', () => {
    const parts = resolveHoverExpandFitDurationParts({
      availableHeightPx: 30,
      currentCardWidthPx,
      currentContentWidthPx: 40,
      currentDurationParts,
      measureHeightAtContentWidth: (contentWidthPx) => (contentWidthPx >= 100 ? 20 : 80),
      ...timeline,
    });

    expect(parts).toBeGreaterThan(currentDurationParts);
    expect(parts).toBeLessThan(TASK_BAR_HOVER_EXPAND_MAX_DURATION_PARTS);
  });

  it('uses four timeslots when the text still does not fit', () => {
    expect(
      resolveHoverExpandFitDurationParts({
        availableHeightPx: 30,
        currentCardWidthPx,
        currentContentWidthPx: 40,
        currentDurationParts,
        measureHeightAtContentWidth: () => 80,
        ...timeline,
      })
    ).toBe(TASK_BAR_HOVER_EXPAND_MAX_DURATION_PARTS);
  });

  it('keeps the current width when the text already fits', () => {
    expect(
      resolveHoverExpandFitDurationParts({
        availableHeightPx: 30,
        currentCardWidthPx,
        currentContentWidthPx: 40,
        currentDurationParts,
        measureHeightAtContentWidth: () => 20,
        ...timeline,
      })
    ).toBe(currentDurationParts);
  });

  it('falls back to four timeslots when text height cannot be measured', () => {
    expect(
      resolveHoverExpandFitDurationParts({
        availableHeightPx: 30,
        currentCardWidthPx,
        currentContentWidthPx: 40,
        currentDurationParts,
        measureHeightAtContentWidth: () => 0,
        ...timeline,
      })
    ).toBe(TASK_BAR_HOVER_EXPAND_MAX_DURATION_PARTS);
  });
});
