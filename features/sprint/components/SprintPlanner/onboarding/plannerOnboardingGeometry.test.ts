import { describe, expect, it } from 'vitest';

import {
  onboardingSampleCardOutline,
  resolveOnboardingMenuCalloutSide,
  unionOnboardingRects,
  onboardingSampleOutlineRect,
  pickOnboardingSprintDayIndex,
  placePlannerOnboardingCallout,
  resolveOnboardingDayColumn,
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

  it('highlights today, or the first sprint day when today is outside the sprint', () => {
    expect(pickOnboardingSprintDayIndex([0, 1, 2], 2)).toBe(2);
    expect(pickOnboardingSprintDayIndex([0, 1, 2], null)).toBe(0);
    expect(pickOnboardingSprintDayIndex([1, 2], 9)).toBe(1);
    const days = [
      { index: 0, rect: { height: 40, left: 0, top: 40, width: 100 } },
      { index: 2, rect: { height: 40, left: 200, top: 40, width: 100 } },
    ];
    expect(
      resolveOnboardingDayColumn({ boardBottom: 500, days, todayIndex: 2 })
    ).toEqual({
      column: { height: 460, left: 200, top: 40, width: 100 },
      dayIndex: 2,
    });
    expect(resolveOnboardingDayColumn({ boardBottom: 500, days, todayIndex: null })?.dayIndex).toBe(
      0
    );
  });

  it('locks the sample outline to the day column while the card animates', () => {
    const card = { height: 58, left: 20, top: 80, width: 140 };
    const day = { height: 400, left: 8, top: 40, width: 100 };
    expect(onboardingSampleCardOutline(card, day, 6)).toEqual({
      height: 58,
      left: 20,
      top: 80,
      width: 88,
    });
    expect(onboardingSampleCardOutline(card, null, 6)).toBe(card);
  });

  it('draws one rectangle around the card and the context menu', () => {
    const card = { height: 58, left: 20, top: 80, width: 140 };
    const menu = { height: 280, left: 180, top: 72, width: 240 };
    expect(unionOnboardingRects(card, menu)).toEqual({
      height: 280,
      left: 20,
      top: 72,
      width: 400,
    });
    expect(unionOnboardingRects(card, null)).toBe(card);
    expect(unionOnboardingRects(null, null)).toBeNull();
  });

  it('places the menu callout on the side that has room', () => {
    const menu = { height: 280, left: 400, top: 80, width: 240 };
    expect(resolveOnboardingMenuCalloutSide(menu, 1200, 320)).toBe('right');
    expect(resolveOnboardingMenuCalloutSide(menu, 700, 320)).toBe('left');
    expect(resolveOnboardingMenuCalloutSide(null, 1200, 320)).toBe('left');
  });

  it('keeps the sample outline at the full-day width while the card grows by one part', () => {
    const grown = { height: 58, left: 12, top: 80, width: 120 };
    expect(onboardingSampleOutlineRect(grown, false, 3)).toBe(grown);
    expect(onboardingSampleOutlineRect(grown, true, 3)).toEqual({ ...grown, width: 90 });
  });

  it('treats equal boxes as the same rect', () => {
    const box = { height: 1, left: 2, top: 3, width: 4 };
    expect(sameRect(box, { ...box })).toBe(true);
    expect(sameRect(box, null)).toBe(false);
  });
});
