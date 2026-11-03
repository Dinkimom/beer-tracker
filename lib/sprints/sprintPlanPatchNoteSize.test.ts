import type { SprintContextNote } from './sprintContextTypes';

import { describe, expect, it } from 'vitest';

import {
  estimatePlanPatchNoteCardRows,
  fitPlanPatchNoteHeights,
  resolvePlanPatchCreateNoteSize,
} from './sprintPlanPatchNoteSize';

const LONG_TEXT =
  'Need a follow-up with QA on the login retry path and the empty-state copy after the token expires.';

function note(extra: Partial<SprintContextNote> = {}): SprintContextNote {
  return {
    assigneeId: 'u1',
    authorName: null,
    day: 0,
    height: 8,
    id: 'n1',
    kind: 'text',
    part: 0,
    text: 'Hi',
    width: 4,
    ...extra,
  };
}

describe('estimatePlanPatchNoteCardRows', () => {
  it('keeps a short note as tall as a task card', () => {
    expect(estimatePlanPatchNoteCardRows('Hi', 200)).toBe(1);
    expect(estimatePlanPatchNoteCardRows('UI approve check', 4)).toBe(1);
  });

  it('wraps a phrase into extra rows on a narrow 2-part card', () => {
    // ~38px под текст: «UI / approve / check» — три-четыре строки, в один ряд влезает две.
    expect(estimatePlanPatchNoteCardRows('UI approve check', 2)).toBe(2);
  });

  it('shrinks as the card gets wider', () => {
    expect(estimatePlanPatchNoteCardRows(LONG_TEXT, 2)).toBe(6);
    expect(estimatePlanPatchNoteCardRows(LONG_TEXT, 4)).toBe(2);
    expect(estimatePlanPatchNoteCardRows(LONG_TEXT, 9)).toBe(1);
  });

  it('reads the card width against the day grid', () => {
    expect(estimatePlanPatchNoteCardRows(LONG_TEXT, 4, 2)).toBe(2);
    expect(estimatePlanPatchNoteCardRows(LONG_TEXT, 4, 4)).toBe(3);
  });

  it('collapses line breaks in plain text, as the card renders it', () => {
    expect(estimatePlanPatchNoteCardRows('one\ntwo\nthree\nfour', 6)).toBe(1);
  });

  it('counts markdown lines with their padding', () => {
    // Пункт чеклиста — 22px, в карточку в один ряд (42px под текст) влезает один.
    expect(estimatePlanPatchNoteCardRows('- [ ] one', 4)).toBe(1);
    expect(estimatePlanPatchNoteCardRows('- [ ] one\n- [ ] two', 4)).toBe(2);
    expect(estimatePlanPatchNoteCardRows('- [ ] one\n- [ ] two\n- [ ] three', 4)).toBe(2);
    expect(estimatePlanPatchNoteCardRows('# Release\n- api\n- web\n- qa', 4)).toBe(2);
  });

  it('caps at the planner max card rows', () => {
    const manyLines = Array.from({ length: 40 }, (_, index) => `- line ${index}`).join('\n');
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

describe('fitPlanPatchNoteHeights', () => {
  it('fills createNote height and keeps an explicit one', () => {
    const [fitted, explicit] = fitPlanPatchNoteHeights(
      [
        { assigneeId: 'u1', day: 0, op: 'createNote', part: 0, text: LONG_TEXT, width: 2 },
        { assigneeId: 'u1', day: 1, height: 3, op: 'createNote', part: 0, text: 'Hi', width: 2 },
      ],
      [],
      3
    );
    expect(fitted).toMatchObject({ height: 6 });
    expect(explicit).toMatchObject({ height: 3 });
  });

  it('refits updateNote when text or width changes, using the stored note for the rest', () => {
    const ops = fitPlanPatchNoteHeights(
      [
        { commentId: 'n1', op: 'updateNote', text: 'Ok' },
        { commentId: 'n1', op: 'updateNote', width: 2 },
        { color: 'pink', commentId: 'n1', op: 'updateNote' },
      ],
      [note({ text: LONG_TEXT })],
      3
    );
    expect(ops[0]).toMatchObject({ height: 1 });
    expect(ops[1]).toMatchObject({ height: 6 });
    expect(ops[2]).not.toHaveProperty('height');
  });

  it('leaves non-text notes alone', () => {
    const [op] = fitPlanPatchNoteHeights(
      [{ commentId: 'n1', op: 'updateNote', width: 2 }],
      [note({ kind: 'diagram' })],
      3
    );
    expect(op).not.toHaveProperty('height');
  });
});
