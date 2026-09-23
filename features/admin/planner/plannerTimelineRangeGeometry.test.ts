import { describe, expect, it } from 'vitest';

import {
  clampPlannerTimelineStep,
  plannerDayLengthPlural,
  plannerSlotCenter,
  plannerTimelineTrackSlots,
  ruCountPlural,
} from './plannerTimelineRangeGeometry';

describe('planner timeline range geometry', () => {
  const steps = [
    { slots: 4, storyPoints: 1, untilSlots: 5 },
    { slots: 8, storyPoints: 2, untilSlots: 8 },
  ];

  it('keeps a sprint of days on the track and grows past the last handle', () => {
    expect(plannerTimelineTrackSlots(steps, 4)).toBe(11 * 4);
    expect(plannerTimelineTrackSlots([{ slots: 48, untilSlots: 50 }], 2)).toBe(26 * 2);
  });

  it('keeps a start between the previous segment and the next one', () => {
    expect(clampPlannerTimelineStep(steps, 0, 1, 44)).toEqual({ slots: 1, storyPoints: 1 });
    expect(clampPlannerTimelineStep(steps, 1, 2, 44)).toEqual({ slots: 6, storyPoints: 2 });
  });

  it('places a tick on the range thumb center, not on a raw width percent', () => {
    expect(plannerSlotCenter(1, 22)).toBe('calc(8px + 0 / 21 * (100% - 16px))');
    expect(plannerSlotCenter(22, 22)).toBe('calc(8px + 21 / 21 * (100% - 16px))');
  });

  it('names one day, a fraction, and five days differently', () => {
    expect(plannerDayLengthPlural(4, 4, 'ru')).toBe('one');
    expect(plannerDayLengthPlural(6, 4, 'ru')).toBe('few');
    expect(plannerDayLengthPlural(20, 4, 'ru')).toBe('many');
    expect(plannerDayLengthPlural(84, 4, 'ru')).toBe('one');
    expect(plannerDayLengthPlural(84, 4, 'en')).toBe('many');
    expect(ruCountPlural(1)).toBe('one');
    expect(ruCountPlural(2)).toBe('few');
    expect(ruCountPlural(5)).toBe('many');
    expect(ruCountPlural(11)).toBe('many');
    expect(ruCountPlural(21)).toBe('one');
  });
});
