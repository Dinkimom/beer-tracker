import { describe, expect, it } from 'vitest';

import { QUARTER_NOTE_MAX_ROWS } from './quarterlyPlanLayout';
import { estimateQuarterNoteRows } from './quarterlyPlanNoteSize';

describe('высота заметки по тексту (QN2)', () => {
  it('короткая строка — одна дорожка', () => {
    expect(estimateQuarterNoteRows('Code freeze', 2)).toBe(1);
  });

  it('текст, который переносится, занимает больше дорожек; шире заметка — ниже', () => {
    const text = 'Waiting for the payments API contract before the UI work can start';
    expect(estimateQuarterNoteRows(text, 1)).toBeGreaterThan(estimateQuarterNoteRows(text, 3));
    expect(estimateQuarterNoteRows(text, 3)).toBe(2);
  });

  it('переводы строк сохраняются', () => {
    expect(estimateQuarterNoteRows('one\ntwo\nthree', 3)).toBe(3);
  });

  it('не выше шести дорожек', () => {
    expect(QUARTER_NOTE_MAX_ROWS).toBe(6);
    expect(estimateQuarterNoteRows('word '.repeat(400), 1)).toBe(6);
  });
});
