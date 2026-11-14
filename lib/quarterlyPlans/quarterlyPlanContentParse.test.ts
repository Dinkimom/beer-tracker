import type { QuarterlyPlanContent } from './quarterlyPlanTypes';

import { describe, expect, it } from 'vitest';

import { parseQuarterlyPlanContent } from './quarterlyPlanContentParse';

/** Q4 2026 — 14 недель. */
const Q4 = { quarter: 4, year: 2026 } as const;

function plan(patch: Partial<QuarterlyPlanContent> = {}): QuarterlyPlanContent {
  return {
    assignments: [
      { epicId: 'e1', id: 'a1', memberId: 'staff-1', startWeek: 0, weeks: 2 },
      { epicId: 'e1', id: 'a2', memberId: 'staff-2', startWeek: 2, weeks: 3 },
    ],
    directions: [{ id: 'd1', teamId: 't1', title: 'Checkout' }],
    epics: [{ directionId: 'd1', id: 'e1', issueKey: 'DEMO-1', status: 'backlog', title: 'Payment' }],
    links: [{ fromId: 'a1', id: 'l1', toId: 'a2' }],
    notes: [
      { color: 'yellow', id: 'n1', row: { id: 'e1', kind: 'epic' }, rows: 2, startWeek: 1, text: 'Wait', weeks: 2 },
    ],
    ...patch,
  };
}

function errorOf(raw: unknown, teamIds: ReadonlySet<string> | null = null): string {
  const result = parseQuarterlyPlanContent(raw, Q4, teamIds);
  return result.ok ? '' : result.error;
}

describe('parseQuarterlyPlanContent', () => {
  it('принимает согласованный план и обрезает пробелы в названиях', () => {
    const result = parseQuarterlyPlanContent(
      plan({ directions: [{ id: 'd1', teamId: 't1', title: '  Checkout  ' }] }),
      Q4,
      new Set(['t1'])
    );
    expect(result.ok && result.content.directions[0]?.title).toBe('Checkout');
  });

  it('отклоняет неверную форму: пустое название, неизвестный статус, нет списка', () => {
    expect(errorOf(plan({ directions: [{ id: 'd1', teamId: 't1', title: ' ' }] }))).toMatch(/directions\.0\.title/);
    expect(errorOf({ ...plan(), epics: [{ ...plan().epics[0], status: 'wip' }] })).toMatch(/epics\.0\.status/);
    const { notes: _notes, ...withoutNotes } = plan();
    expect(errorOf(withoutNotes)).toMatch(/^notes/);
  });

  it('отклоняет повторный id и второй раз тот же эпик трекера (QE4)', () => {
    expect(errorOf(plan({ links: [...plan().links, { fromId: 'a2', id: 'l1', toId: 'a1' }] }))).toMatch(
      /links: duplicate id l1/
    );
    const second = { directionId: 'd1', id: 'e2', issueKey: 'DEMO-1', status: 'test', title: 'Copy' } as const;
    expect(errorOf(plan({ epics: [...plan().epics, second] }))).toMatch(/DEMO-1 is in the plan twice/);
    const direction = [{ id: 'd1', issueKey: 'DEMO-1', teamId: 't1', title: 'Checkout' }];
    expect(errorOf(plan({ directions: direction }))).toMatch(/DEMO-1 is in the plan twice/);
  });

  it('отклоняет ссылки на несуществующие сущности', () => {
    expect(errorOf(plan({ epics: [{ ...plan().epics[0]!, directionId: 'd9' }] }))).toMatch(/unknown direction d9/);
    expect(errorOf(plan({ assignments: [{ ...plan().assignments[0]!, epicId: 'e9' }] }))).toMatch(/unknown epic e9/);
    expect(errorOf(plan({ links: [{ fromId: 'a1', id: 'l1', toId: 'a9' }] }))).toMatch(/link l1: unknown assignment/);
    expect(errorOf(plan(), new Set(['t2']))).toMatch(/unknown team t1/);
  });

  it('команды не проверяются, пока их не передали', () => {
    const teamNote = { ...plan().notes[0]!, id: 'n2', row: { id: 't9', kind: 'team' as const } };
    expect(errorOf(plan({ notes: [teamNote] }))).toBe('');
    expect(errorOf(plan({ notes: [teamNote] }), new Set(['t1']))).toMatch(/note n2: unknown team t9/);
  });

  it('отклоняет связь с собой и вторую связь той же пары в обратную сторону (QL4)', () => {
    expect(errorOf(plan({ links: [{ fromId: 'a1', id: 'l1', toId: 'a1' }] }))).toMatch(/itself/);
    expect(errorOf(plan({ links: [...plan().links, { fromId: 'a2', id: 'l2', toId: 'a1' }] }))).toMatch(
      /already linked/
    );
  });

  it('отклоняет сроки за краем квартала и пустые сроки (QA1, QN2)', () => {
    const [first, second] = plan().assignments;
    expect(errorOf(plan({ assignments: [{ ...first!, startWeek: 13, weeks: 2 }, second!] }))).toMatch(
      /a1: weeks 13\+2 outside the quarter \(14\)/
    );
    expect(errorOf(plan({ assignments: [{ ...plan().assignments[0]!, weeks: 0 }] }))).toMatch(/weeks/);
    expect(errorOf(plan({ notes: [{ ...plan().notes[0]!, rows: 5 }] }))).toMatch(/notes\.0\.rows/);
  });
});
