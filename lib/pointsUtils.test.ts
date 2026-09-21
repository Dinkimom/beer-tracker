import { describe, expect, it } from 'vitest';

import {
  formatPointsForDisplay,
  formatSignedPointsDeltaForDisplay,
  formatSprintTotalsPointsLabels,
  formatTaskStoryPointsForDisplay,
  formatTaskTestPointsForDisplay,
  getSprintPointsTotals,
  getTaskStoryPoints,
  getTaskTestPoints,
  isOriginalTask,
  roundPointsForDisplay,
  shouldCountTaskForParticipantVolume,
  storyPointsToTimeslots,
  timeslotsToStoryPoints,
} from './pointsUtils';

describe('isOriginalTask', () => {
  it('returns false for QA phantom team', () => {
    expect(isOriginalTask({ team: 'QA' })).toBe(false);
  });

  it('returns true when team is not QA', () => {
    expect(isOriginalTask({ team: 'Dev' })).toBe(true);
    expect(isOriginalTask({})).toBe(true);
  });
});

describe('getTaskStoryPoints', () => {
  it('returns 0 for QA team', () => {
    expect(getTaskStoryPoints({ storyPoints: 5, team: 'QA' })).toBe(0);
  });

  it('returns storyPoints for non-QA', () => {
    expect(getTaskStoryPoints({ storyPoints: 3 })).toBe(3);
    expect(getTaskStoryPoints({})).toBe(0);
  });
});

describe('getTaskTestPoints', () => {
  it('returns testPoints or 0', () => {
    expect(getTaskTestPoints({ testPoints: 2 })).toBe(2);
    expect(getTaskTestPoints({})).toBe(0);
  });
});

describe('roundPointsForDisplay / formatPointsForDisplay', () => {
  it('rounds to hundredths and strips trailing zeros', () => {
    expect(roundPointsForDisplay(1)).toBe(1);
    expect(roundPointsForDisplay(1.5)).toBe(1.5);
    expect(roundPointsForDisplay(1.234)).toBe(1.23);
    expect(roundPointsForDisplay(1.235)).toBe(1.24);
    expect(roundPointsForDisplay(0.00000000000001)).toBe(0);
    expect(formatPointsForDisplay(1.1)).toBe('1.1');
    expect(formatPointsForDisplay(0.00000000000001)).toBe('0');
  });

  it('treats non-finite values as 0', () => {
    expect(roundPointsForDisplay(Number.NaN)).toBe(0);
    expect(roundPointsForDisplay(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('formatTaskStoryPointsForDisplay', () => {
  it('formats undefined as unknown and rounds fractions', () => {
    expect(formatTaskStoryPointsForDisplay({})).toBe('?sp');
    expect(formatTaskStoryPointsForDisplay({ storyPoints: 1.234 })).toBe('1.23sp');
    expect(formatTaskStoryPointsForDisplay({ storyPoints: 0.00000000000001 }, 'spaced')).toBe(
      '0 sp'
    );
  });
});

describe('formatTaskTestPointsForDisplay', () => {
  it('formats undefined/null as unknown', () => {
    expect(formatTaskTestPointsForDisplay({})).toBe('?tp');
    expect(formatTaskTestPointsForDisplay({ testPoints: undefined }, 'spaced')).toBe('? tp');
  });

  it('formats number in compact and spaced styles', () => {
    expect(formatTaskTestPointsForDisplay({ testPoints: 0 })).toBe('0tp');
    expect(formatTaskTestPointsForDisplay({ testPoints: 4 }, 'spaced')).toBe('4 tp');
    expect(formatTaskTestPointsForDisplay({ testPoints: 1.239 })).toBe('1.24tp');
  });
});

describe('formatSprintTotalsPointsLabels', () => {
  it('hides values that round to 0', () => {
    expect(formatSprintTotalsPointsLabels(0.00000000000001, 2)).toEqual({
      spLabel: null,
      tpLabel: '2tp',
    });
    expect(formatSprintTotalsPointsLabels(1.5, 0, 'spaced')).toEqual({
      spLabel: '1.5 sp',
      tpLabel: null,
    });
  });
});

describe('formatSignedPointsDeltaForDisplay', () => {
  it('formats signed deltas and hides rounded zeros', () => {
    expect(formatSignedPointsDeltaForDisplay(1.5, 'sp')).toBe('+1.5 sp');
    expect(formatSignedPointsDeltaForDisplay(-0.251, 'tp')).toBe('-0.25 tp');
    expect(formatSignedPointsDeltaForDisplay(0.00000000000001, 'sp')).toBeNull();
  });
});

describe('timeslotsToStoryPoints', () => {
  it('maps edges and ranges', () => {
    expect(timeslotsToStoryPoints(0)).toBe(0);
    expect(timeslotsToStoryPoints(1)).toBe(1);
    expect(timeslotsToStoryPoints(3)).toBe(3);
    expect(timeslotsToStoryPoints(4)).toBe(5);
    expect(timeslotsToStoryPoints(7)).toBe(8);
    expect(timeslotsToStoryPoints(9)).toBe(13);
    expect(timeslotsToStoryPoints(10)).toBe(21);
    expect(timeslotsToStoryPoints(99)).toBe(21);
  });
});

describe('storyPointsToTimeslots', () => {
  it('is inverse lower-bound mapping', () => {
    expect(storyPointsToTimeslots(0)).toBe(0);
    expect(storyPointsToTimeslots(5)).toBe(5);
    expect(storyPointsToTimeslots(8)).toBe(6);
    expect(storyPointsToTimeslots(13)).toBe(8);
    expect(storyPointsToTimeslots(21)).toBe(10);
  });
});

describe('shouldCountTaskForParticipantVolume', () => {
  it('counts real tasks and new-task drafts only', () => {
    expect(shouldCountTaskForParticipantVolume({ id: 'ISSUE-1', storyPoints: 3 })).toBe(true);
    expect(
      shouldCountTaskForParticipantVolume({
        isLocalTask: true,
        localDraftKind: 'task',
        storyPoints: 1,
      })
    ).toBe(true);
    expect(shouldCountTaskForParticipantVolume({ isLocalTask: true })).toBe(false);
    expect(
      shouldCountTaskForParticipantVolume({ isLocalTask: true, localDraftKind: 'existing' })
    ).toBe(false);
    expect(
      shouldCountTaskForParticipantVolume({ isLocalTask: true, localDraftKind: 'comment' })
    ).toBe(false);
    expect(
      shouldCountTaskForParticipantVolume({
        id: 'comment:c1',
        localDraftKind: 'comment',
        storyPoints: 0,
      })
    ).toBe(false);
    expect(
      shouldCountTaskForParticipantVolume({ id: 'comment:c1', storyPoints: 0 })
    ).toBe(false);
  });
});

describe('getSprintPointsTotals', () => {
  it('sums SP/TP only for original tasks', () => {
    const tasks = [
      { id: 'a', storyPoints: 2, testPoints: 1, team: 'X' },
      { id: 'b', storyPoints: 3, testPoints: 0, team: 'QA' },
    ];
    expect(getSprintPointsTotals(tasks)).toEqual({ totalSP: 2, totalTP: 1 });
  });

  it('excludes goal task ids when provided', () => {
    const tasks = [{ id: 'g', storyPoints: 5, testPoints: 1 }];
    expect(getSprintPointsTotals(tasks, { goalTaskIds: 'g' })).toEqual({ totalSP: 0, totalTP: 0 });
  });
});
