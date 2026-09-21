import { describe, expect, it } from 'vitest';

import {
  estimatePlanPatchNoteCardRows,
  resolvePlanPatchCreateNoteSize,
} from './sprintPlanPatchNoteSize';

describe('estimatePlanPatchNoteCardRows', () => {
  it('keeps a short note as tall as a task card', () => {
    expect(estimatePlanPatchNoteCardRows('UI approve check', 200)).toBe(1);
    expect(estimatePlanPatchNoteCardRows('Hi', 200)).toBe(1);
  });

  it('grows when wrapped lines would overflow one task-height card', () => {
    const long =
      'Need a follow-up with QA on the login retry path and the empty-state copy after the token expires.';
    expect(estimatePlanPatchNoteCardRows(long, 200)).toBeGreaterThan(1);
  });

  it('grows with explicit line breaks even when each line is short', () => {
    expect(estimatePlanPatchNoteCardRows('one\ntwo\nthree\nfour', 200)).toBe(2);
  });

  it('caps at the planner max card rows', () => {
    const manyLines = Array.from({ length: 40 }, (_, index) => `line ${index}`).join('\n');
    expect(estimatePlanPatchNoteCardRows(manyLines, 200)).toBe(10);
  });
});

describe('resolvePlanPatchCreateNoteSize', () => {
  it('defaults width and infers height from text', () => {
    expect(resolvePlanPatchCreateNoteSize({ text: 'Short' })).toEqual({ height: 1, width: 200 });
  });

  it('keeps an explicit height from the agent', () => {
    expect(resolvePlanPatchCreateNoteSize({ height: 4, text: 'Short', width: 2 })).toEqual({
      height: 4,
      width: 2,
    });
  });
});
