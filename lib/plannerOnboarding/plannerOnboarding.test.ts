import { describe, expect, it } from 'vitest';

import {
  normalizePlannerOnboarding,
  plannerBoardHasPlacedWork,
  plannerOnboardingAnchor,
  plannerOnboardingCalloutSide,
  resolvePlannerOnboardingTip,
  withPlannerOnboardingTipSeen,
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

  it('drops unknown persisted tips and keeps a single copy of each', () => {
    expect(
      normalizePlannerOnboarding({
        seenTips: ['layers', 'nope', 'layers', 'link'],
        tourCompleted: true,
      })
    ).toEqual({
      seenTips: ['layers', 'link'],
      tourCompleted: true,
    });
    expect(normalizePlannerOnboarding(null)).toEqual({
      seenTips: [],
      tourCompleted: false,
    });
  });

  it('shows one unseen tip and hides tips while the tour is running', () => {
    const signals = {
      featuresView: true,
      layers: false,
      link: false,
      taskTool: true,
    };
    expect(resolvePlannerOnboardingTip(false, [], signals)).toBeNull();
    expect(resolvePlannerOnboardingTip(true, [], signals)).toBe('taskTool');
    expect(resolvePlannerOnboardingTip(true, ['taskTool'], signals)).toBe('featuresView');
  });

  it('records a tip once', () => {
    const seen = withPlannerOnboardingTipSeen(
      { seenTips: [], tourCompleted: true },
      'layers'
    );
    expect(seen.seenTips).toEqual(['layers']);
    expect(withPlannerOnboardingTipSeen(seen, 'layers')).toBe(seen);
  });
});
