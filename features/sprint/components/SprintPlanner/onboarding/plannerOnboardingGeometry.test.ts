import { describe, expect, it } from 'vitest';

import {
  placePlannerOnboardingCallout,
  resolvePlannerOnboardingGhostRect,
  sameRect,
} from './plannerOnboardingGeometry';

describe('planner onboarding geometry', () => {
  it('sizes the empty-board ghost to one timeslot on the first lane', () => {
    const ghost = resolvePlannerOnboardingGhostRect(
      { height: 120, left: 200, top: 80, width: 900 },
      { cardHeightPx: 58, insetPx: 12, marginPx: 12, slotCount: 10 }
    );
    expect(ghost).toEqual({
      height: 58,
      left: 212,
      top: 92,
      width: 66,
    });
  });

  it('skips a ghost that would be thinner than a card', () => {
    expect(
      resolvePlannerOnboardingGhostRect(
        { height: 40, left: 0, top: 0, width: 100 },
        { cardHeightPx: 58, insetPx: 12, marginPx: 12, slotCount: 40 }
      )
    ).toBeNull();
  });

  it('keeps the callout inside the viewport', () => {
    expect(
      placePlannerOnboardingCallout(
        { height: 40, left: 8, top: 8, width: 80 },
        'right',
        { height: 200, width: 300 },
        { height: 160, width: 280 }
      )
    ).toEqual({ left: 16, top: 16 });
  });

  it('places a callout above a toolbar target', () => {
    expect(
      placePlannerOnboardingCallout(
        { height: 50, left: 400, top: 700, width: 200 },
        'above',
        { height: 800, width: 1200 },
        { height: 160, width: 320 }
      )
    ).toEqual({ left: 340, top: 528 });
  });

  it('treats equal boxes as the same rect', () => {
    const box = { height: 1, left: 2, top: 3, width: 4 };
    expect(sameRect(box, { ...box })).toBe(true);
    expect(sameRect(box, null)).toBe(false);
  });
});
