import type { QuarterlyPlanIssue } from '@/lib/quarterlyPlans/quarterlyPlanIssues';
import type { QuarterlyPlanContent } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { describe, expect, it } from 'vitest';

import { applyDraftTitle, QuarterBoardRows } from './quarterBoardRows';

const epics = [
  { directionId: 'd1', id: 'e1', status: 'backlog' as const, title: 'API' },
  { directionId: 'd1', id: 'task', parentEpicId: 'e1', status: 'backlog' as const, title: 'Endpoint' },
];
const plan = {
  assignments: [
    { epicId: 'task', id: 'a-task', memberId: 'ann', startWeek: 1, weeks: 1 },
    { directionId: 'd2', id: 'a-dir', memberId: 'ann', startWeek: 1, weeks: 1 },
  ],
  epics,
};
const issue = (assignmentId: string, directionId: string): QuarterlyPlanIssue =>
  ({ assignmentId, directionId, teamId: 't1' }) as QuarterlyPlanIssue;

describe('QuarterBoardRows', () => {
  it('поле новой задачи раскрывает её эпик; закрытое поле отдаёт свою строку один раз', () => {
    const rows = new QuarterBoardRows();
    rows.startDraft({ directionId: 'd1', kind: 'newEpic', parentEpicId: 'e1' });
    expect(rows.expandedEpicIds.has('e1')).toBe(true);
    expect(rows.takeDraft()).toMatchObject({ parentEpicId: 'e1' });
    expect(rows.draft).toBeNull();
    expect(rows.takeDraft()).toBeNull();
  });

  it('«Дни» раскрывают все эпики с задачами, «Недели» сворачивают', () => {
    const rows = new QuarterBoardRows();
    rows.showDetail('days', epics);
    expect([...rows.expandedEpicIds]).toEqual(['e1']);
    rows.showDetail('weeks', epics);
    expect(rows.expandedEpicIds.size).toBe(0);
  });

  it('переход к проблеме раскрывает команду, направление и эпик задачи; по кругу', () => {
    const rows = new QuarterBoardRows();
    rows.toggleCollapsed('t1');
    rows.toggleCollapsed('d1');
    const issues = [issue('a-task', 'd1'), issue('a-dir', 'd2')];

    rows.focusNextIssue(issues, plan);
    expect(rows.focusedIssue).toEqual({ assignmentId: 'a-task', nonce: 1 });
    expect(rows.collapsedIds.size).toBe(0);
    expect(rows.expandedEpicIds.has('e1')).toBe(true);

    rows.focusNextIssue(issues, plan);
    rows.focusNextIssue(issues, plan);
    expect(rows.focusedIssue).toEqual({ assignmentId: 'a-task', nonce: 3 });
  });

  it('без проблем переход ничего не делает', () => {
    const rows = new QuarterBoardRows();
    rows.focusNextIssue([], plan);
    expect(rows.focusedIssue).toBeNull();
  });
});

describe('applyDraftTitle', () => {
  const content = {
    assignments: [],
    directions: [{ id: 'd1', teamId: 't1', title: 'Checkout' }],
    epics,
    links: [],
    notes: [],
  } as unknown as QuarterlyPlanContent;

  it('новая задача встаёт в эпик со статусом «бэклог»', () => {
    const next = applyDraftTitle(content, { directionId: 'd1', kind: 'newEpic', parentEpicId: 'e1' }, 'Tests', 'new');
    expect(next.epics.find((epic) => epic.id === 'new')).toEqual({
      directionId: 'd1',
      id: 'new',
      parentEpicId: 'e1',
      status: 'backlog',
      title: 'Tests',
    });
  });

  it('новое направление и переименование', () => {
    expect(applyDraftTitle(content, { kind: 'newDirection', teamId: 't1' }, 'Hiring', 'd2').directions.map((d) => d.title)).toEqual([
      'Checkout',
      'Hiring',
    ]);
    expect(applyDraftTitle(content, { id: 'e1', kind: 'renameEpic' }, 'Public API', 'x').epics[0].title).toBe('Public API');
  });
});
