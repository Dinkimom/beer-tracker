import type { StoryPhasePosition } from '../types';

import { describe, expect, it } from 'vitest';

import {
  canPickStoryEventKind,
  getStoryEventMenuCatalog,
  getStoryEventMenuFollowUpHint,
  isWeekEligibleForStoryEvent,
  storyEventPickDisabledReason,
} from './quarterlyStoryEventPlacement';
import { toWeekColumnPosition } from './quarterlyWeekPositions';
import { storyPhaseToTaskPosition } from './storyPhasePositions';

const STORY_KEY = 'S-1';

const deliveryPhase: StoryPhasePosition = {
  id: 'd1',
  kind: 'delivery',
  sprintIndex: 0,
  startDay: 0,
  durationDays: 5,
};

const discoveryPhase: StoryPhasePosition = {
  id: 'disc1',
  kind: 'discovery',
  sprintIndex: 1,
  startDay: 0,
  durationDays: 5,
};

function weekPositionsFor(phases: StoryPhasePosition[]) {
  return phases.map((phase) => ({
    phase,
    weekPos: toWeekColumnPosition(storyPhaseToTaskPosition(STORY_KEY, phase)),
  }));
}

describe('quarterlyStoryEventPlacement', () => {
  const deliveryWeekPositions = weekPositionsFor([deliveryPhase]);
  const discoveryWeekPositions = weekPositionsFor([discoveryPhase]);
  const deliveryWeekIndex = deliveryWeekPositions[0]!.weekPos.startDay;
  const discoveryWeekIndex = discoveryWeekPositions[0]!.weekPos.startDay;

  it('empty week without plan is not eligible for plan-bound events', () => {
    expect(
      isWeekEligibleForStoryEvent({
        weekIndex: 0,
        weekPositions: [],
        existingEvent: undefined,
      })
    ).toBe(false);
  });

  it('week with delivery plan is eligible', () => {
    expect(
      isWeekEligibleForStoryEvent({
        weekIndex: deliveryWeekIndex,
        weekPositions: deliveryWeekPositions,
        existingEvent: undefined,
      })
    ).toBe(true);
  });

  it('week with delivery taken event is eligible without plan bar', () => {
    expect(
      isWeekEligibleForStoryEvent({
        weekIndex: 2,
        weekPositions: [],
        existingEvent: { id: 'e1', kind: 'delivery_as_planned', weekIndex: 2 },
      })
    ).toBe(true);
  });

  it('week with release expected is eligible without plan bar', () => {
    expect(
      isWeekEligibleForStoryEvent({
        weekIndex: 4,
        weekPositions: [],
        existingEvent: { id: 'e1', kind: 'release_expected_this_week', weekIndex: 4 },
      })
    ).toBe(true);
  });

  it('not_taken_on_time requires eligible week', () => {
    const ctx = {
      weekIndex: deliveryWeekIndex,
      weekPositions: deliveryWeekPositions,
      existingEvent: undefined,
    };
    expect(canPickStoryEventKind('not_taken_on_time', ctx)).toBe(true);
    expect(canPickStoryEventKind('not_taken_on_time', { ...ctx, weekPositions: [] })).toBe(false);
  });

  it('delivery, discovery and release expected can be placed without plan', () => {
    const emptyWeek = {
      weekIndex: 3,
      weekPositions: [],
      existingEvent: undefined,
    };

    expect(canPickStoryEventKind('delivery_as_planned', emptyWeek)).toBe(true);
    expect(canPickStoryEventKind('discovery_as_planned', emptyWeek)).toBe(true);
    expect(canPickStoryEventKind('release_expected_this_week', emptyWeek)).toBe(true);
    expect(storyEventPickDisabledReason('release_expected_this_week', emptyWeek)).toBeNull();
  });

  it('discovery plan week forbids release and delivery taken', () => {
    const ctx = {
      weekIndex: discoveryWeekIndex,
      weekPositions: discoveryWeekPositions,
      existingEvent: undefined,
    };

    expect(canPickStoryEventKind('discovery_as_planned', ctx)).toBe(true);
    expect(canPickStoryEventKind('not_taken_on_time', ctx)).toBe(true);
    expect(canPickStoryEventKind('delivery_as_planned', ctx)).toBe(false);
    expect(canPickStoryEventKind('release_expected_this_week', ctx)).toBe(false);
    expect(canPickStoryEventKind('task_released', ctx)).toBe(false);
    expect(storyEventPickDisabledReason('delivery_as_planned', ctx)).toBe(
      'noDeliveryTakenInDiscovery'
    );
    expect(storyEventPickDisabledReason('release_expected_this_week', ctx)).toBe(
      'noReleaseInDiscovery'
    );
  });

  it('delivery plan week forbids discovery taken', () => {
    const ctx = {
      weekIndex: deliveryWeekIndex,
      weekPositions: deliveryWeekPositions,
      existingEvent: undefined,
    };

    expect(canPickStoryEventKind('delivery_as_planned', ctx)).toBe(true);
    expect(canPickStoryEventKind('release_expected_this_week', ctx)).toBe(true);
    expect(canPickStoryEventKind('discovery_as_planned', ctx)).toBe(false);
    expect(storyEventPickDisabledReason('discovery_as_planned', ctx)).toBe(
      'noDiscoveryTakenInDelivery'
    );
  });

  it('release expected follow-up menu offers only successful release', () => {
    const ctx = {
      weekIndex: 5,
      weekPositions: [],
      existingEvent: { id: 'e1', kind: 'release_expected_this_week' as const, weekIndex: 5 },
    };

    expect(getStoryEventMenuCatalog(ctx).map((e) => e.kind)).toEqual(['task_released']);
    expect(canPickStoryEventKind('task_released', ctx)).toBe(true);
    expect(canPickStoryEventKind('not_taken_on_time', ctx)).toBe(false);
  });

  it('release succeeded is terminal — only removal', () => {
    const ctx = {
      weekIndex: 6,
      weekPositions: [],
      existingEvent: { id: 'e2', kind: 'task_released' as const, weekIndex: 6 },
    };

    expect(getStoryEventMenuCatalog(ctx)).toEqual([]);
    expect(canPickStoryEventKind('task_released', ctx)).toBe(false);
    expect(canPickStoryEventKind('release_expected_this_week', ctx)).toBe(false);
    expect(getStoryEventMenuFollowUpHint(ctx)).toBe('releaseSucceeded');
  });
});
