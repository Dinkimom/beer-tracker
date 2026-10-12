import { describe, expect, it } from 'vitest';

import { CARD_MARGIN, SWIMLANE_DAY_CARD_WIDTH_PX, WORKING_DAYS } from '@/constants';
import {
  SPRINT_PLANNER_DAY_MAX_WIDTH_PX,
  sprintPlannerContentRowWidthCss,
  sprintPlannerDaysHeaderContentWidthCss,
  sprintPlannerFullTimelineWidthExpr,
  sprintPlannerMaxTimelineWidthPx,
  sprintPlannerOverflowTimelineWidthCss,
  sprintPlannerSwimlaneTimelineWidthCss,
} from '@/features/sprint/components/SprintPlanner/layout/sprintPlannerSwimlaneLayoutWidths';

describe('sprintPlannerSwimlaneLayoutWidths', () => {
  it('day max keeps the 1-day card width and grows the arrow gutter', () => {
    expect(SPRINT_PLANNER_DAY_MAX_WIDTH_PX).toBe(SWIMLANE_DAY_CARD_WIDTH_PX + CARD_MARGIN * 2);
    expect(SWIMLANE_DAY_CARD_WIDTH_PX).toBe(250);
  });

  it('max timeline width matches working days × day max', () => {
    expect(sprintPlannerMaxTimelineWidthPx()).toBe(WORKING_DAYS * SPRINT_PLANNER_DAY_MAX_WIDTH_PX);
  });

  it('full timeline expr subtracts participants and sidebar', () => {
    expect(sprintPlannerFullTimelineWidthExpr(200, 64)).toBe('calc(200vw - 200px - 64px)');
  });

  it('swimlane timeline in full mode uses min(full expr, max px)', () => {
    const maxPx = sprintPlannerMaxTimelineWidthPx();
    expect(sprintPlannerSwimlaneTimelineWidthCss('full', 180, 0)).toBe(
      `min(calc(200vw - 180px - 0px), ${maxPx}px)`
    );
  });

  it('swimlane timeline in compact mode is 100%', () => {
    expect(sprintPlannerSwimlaneTimelineWidthCss('compact', 180, 0)).toBe('100%');
  });

  it('days header content width in full mode matches participants + min timeline', () => {
    const maxPx = sprintPlannerMaxTimelineWidthPx();
    expect(sprintPlannerDaysHeaderContentWidthCss('full', 200, 48)).toBe(
      `calc(200px + min(calc(200vw - 200px - 48px), ${maxPx}px))`
    );
  });

  it('days header content width in compact mode is 100%', () => {
    expect(sprintPlannerDaysHeaderContentWidthCss('compact', 200, 48)).toBe('100%');
  });

  it('content row width in full mode is max(100%, content) so after-sprint rail can fill', () => {
    const content = sprintPlannerDaysHeaderContentWidthCss('full', 200, 48, 5);
    expect(sprintPlannerContentRowWidthCss('full', 200, 48, 5)).toBe(`max(100%, ${content})`);
  });

  it('content row width in compact mode is 100%', () => {
    expect(sprintPlannerContentRowWidthCss('compact', 200, 48, 5)).toBe('100%');
  });

  it('does not widen the row when the plan stays inside the timeline', () => {
    expect(sprintPlannerOverflowTimelineWidthCss('full', 200, 48, 5, 0, 15)).toBeNull();
    expect(sprintPlannerContentRowWidthCss('full', 200, 48, 5, null)).toBe(
      `max(100%, ${sprintPlannerDaysHeaderContentWidthCss('full', 200, 48, 5)})`
    );
  });

  it('adds the overflow tail in full mode and ignores it in compact mode', () => {
    const overflow = sprintPlannerOverflowTimelineWidthCss('full', 200, 48, 10, 3, 30);
    const timeline = sprintPlannerSwimlaneTimelineWidthCss('full', 200, 48, 10);
    expect(overflow).toBe(`calc(3 * (${timeline}) / 30)`);
    expect(sprintPlannerOverflowTimelineWidthCss('compact', 200, 48, 10, 3, 30)).toBeNull();
    const content = sprintPlannerDaysHeaderContentWidthCss('full', 200, 48, 10);
    expect(sprintPlannerContentRowWidthCss('full', 200, 48, 10, overflow)).toBe(
      `max(100%, calc(${content} + ${overflow}))`
    );
  });
});
