import { describe, expect, it } from 'vitest';

import { isPlanPatchScheduleLink, planPatchScheduleArrowColor } from './PlanPatchScheduleArrows';

describe('isPlanPatchScheduleLink', () => {
  it('links a date move to its current card', () => {
    expect(isPlanPatchScheduleLink({ changes: ['schedule'], remove: false })).toBe(true);
    expect(isPlanPatchScheduleLink({ changes: ['schedule', 'duration'], remove: false })).toBe(true);
  });

  it('skips adds and removals', () => {
    expect(isPlanPatchScheduleLink({ changes: [], remove: false })).toBe(false);
    expect(isPlanPatchScheduleLink({ changes: [], remove: true })).toBe(false);
  });
});

describe('planPatchScheduleArrowColor', () => {
  it('keeps the idle link color until hover', () => {
    expect(planPatchScheduleArrowColor(false, false, '#d1d5db')).toBe('#d1d5db');
  });

  it('uses the focus-ring sky on hover', () => {
    expect(planPatchScheduleArrowColor(true, false, '#d1d5db')).toBe('rgb(14 165 233 / 0.8)');
    expect(planPatchScheduleArrowColor(true, true, '#d1d5db')).toBe('#38bdf8');
  });
});
