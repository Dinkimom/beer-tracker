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

  it('anchors the three beats to the lane, the days, then the toolbar', () => {
    expect(plannerOnboardingAnchor('lane')).toBe('lane');
    expect(plannerOnboardingAnchor('span')).toBe('days');
    expect(plannerOnboardingAnchor('tools')).toBe('toolbar');
    expect(plannerOnboardingCalloutSide('lane')).toBe('right');
    expect(plannerOnboardingCalloutSide('span')).toBe('below');
    expect(plannerOnboardingCalloutSide('tools')).toBe('above');
  });

  it('drops unknown persisted tips and keeps a single copy of each', () => {
    expect(
      normalizePlannerOnboarding({
        seenTips: ['resize', 'nope', 'resize', 'link'],
        tourCompleted: true,
      })
    ).toEqual({
      seenTips: ['resize', 'link'],
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
      resize: true,
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
