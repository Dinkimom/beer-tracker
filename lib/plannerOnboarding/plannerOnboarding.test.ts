import { describe, expect, it } from 'vitest';

import {
  normalizePlannerOnboarding,
  plannerBoardHasPlacedWork,
  plannerOnboardingAnchor,
  plannerOnboardingCalloutSide,
  isPlannerOnboardingSurface,
} from './plannerOnboarding';

describe('planner onboarding state', () => {
  it('treats swimlane views as the onboarding surface', () => {
    expect(isPlannerOnboardingSurface('full')).toBe(true);
    expect(isPlannerOnboardingSurface('compact')).toBe(true);
    expect(isPlannerOnboardingSurface('features')).toBe(true);
    expect(isPlannerOnboardingSurface('kanban')).toBe(false);
  });

  it('ignores notes and drafts when deciding the board is empty', () => {
    expect(plannerBoardHasPlacedWork(null)).toBe(false);
    expect(
      plannerBoardHasPlacedWork(
        new Map([
          ['comment:1', {}],
          ['local-task-2', {}],
        ])
      )
    ).toBe(false);
    expect(plannerBoardHasPlacedWork(new Map([['QUEUE-1', {}]]))).toBe(true);
  });

  it('anchors the tour to the lane, a day, the sample task, then the row again', () => {
    expect(plannerOnboardingAnchor('lane')).toBe('lane');
    expect(plannerOnboardingAnchor('span')).toBe('day');
    expect(plannerOnboardingAnchor('task')).toBe('task');
    expect(plannerOnboardingAnchor('resize')).toBe('lane');
    expect(plannerOnboardingAnchor('drag')).toBe('lane');
    expect(plannerOnboardingAnchor('assignees')).toBe('lanes');
    expect(plannerOnboardingAnchor('link')).toBe('lanes');
    expect(plannerOnboardingAnchor('menu')).toBe('menu');
    expect(plannerOnboardingCalloutSide('lane')).toBe('below');
    expect(plannerOnboardingCalloutSide('resize')).toBe('below');
    expect(plannerOnboardingCalloutSide('drag')).toBe('below');
    expect(plannerOnboardingCalloutSide('assignees')).toBe('below');
    expect(plannerOnboardingCalloutSide('link')).toBe('below');
    expect(plannerOnboardingCalloutSide('task')).toBe('right');
  });

  it('reads only tourCompleted from persisted state', () => {
    expect(
      normalizePlannerOnboarding({
        seenTips: ['layers', 'link'],
        tourCompleted: true,
      })
    ).toEqual({
      tourCompleted: true,
    });
    expect(normalizePlannerOnboarding(null)).toEqual({
      tourCompleted: false,
    });
  });
});
