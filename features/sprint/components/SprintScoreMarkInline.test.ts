import { describe, expect, it } from 'vitest';

import {
  clampSprintScoreMark,
  SPRINT_SCORE_MAX_MARK,
} from './SprintScoreMarkInline';

describe('clampSprintScoreMark', () => {
  it('clamps to 0..5 and rounds', () => {
    expect(clampSprintScoreMark(-1)).toBe(0);
    expect(clampSprintScoreMark(0)).toBe(0);
    expect(clampSprintScoreMark(3.4)).toBe(3);
    expect(clampSprintScoreMark(3.6)).toBe(4);
    expect(clampSprintScoreMark(SPRINT_SCORE_MAX_MARK)).toBe(5);
    expect(clampSprintScoreMark(99)).toBe(5);
  });

  it('treats non-finite as 0', () => {
    expect(clampSprintScoreMark(Number.NaN)).toBe(0);
    expect(clampSprintScoreMark(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
