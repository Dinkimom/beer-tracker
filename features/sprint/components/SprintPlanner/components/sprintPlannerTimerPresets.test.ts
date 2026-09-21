import { describe, expect, it } from 'vitest';

import {
  clampSprintTimerSetupMs,
  parseTimerDigitInput,
  sanitizeTimerDigitInput,
  sprintTimerMsFromParts,
  sprintTimerPartsFromMs,
} from './sprintPlannerTimerPresets';

describe('sprintPlannerTimerPresets', () => {
  it('clamps setup duration to 0..99 minutes', () => {
    expect(clampSprintTimerSetupMs(Number.NaN)).toBe(5 * 60_000);
    expect(clampSprintTimerSetupMs(-10)).toBe(0);
    expect(clampSprintTimerSetupMs(200 * 60_000)).toBe(99 * 60_000);
  });

  it('splits and joins minutes and seconds', () => {
    expect(sprintTimerPartsFromMs(3 * 60_000 + 7_000)).toEqual({ minutes: 3, seconds: 7 });
    expect(sprintTimerMsFromParts(3, 7)).toBe(3 * 60_000 + 7_000);
    expect(sprintTimerMsFromParts(0, 45)).toBe(45_000);
    expect(sprintTimerMsFromParts(0, 80)).toBe(59_000);
  });

  it('keeps only two digit characters in a field', () => {
    expect(sanitizeTimerDigitInput('a1b2c3')).toBe('12');
    expect(parseTimerDigitInput('', 59)).toBe(0);
    expect(parseTimerDigitInput('7', 59)).toBe(7);
    expect(parseTimerDigitInput('90', 59)).toBe(59);
  });
});
