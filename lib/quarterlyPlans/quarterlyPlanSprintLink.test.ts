import type { QuarterlyPlanContent } from './quarterlyPlanTypes';

import { describe, expect, it } from 'vitest';

import { buildSprintQuarterPlanView, planRowOfIssue } from './quarterlyPlanSprintLink';

const Q4 = { quarter: 4, year: 2026 } as const;
/** Недели 4–5 четвёртого квартала 2026: 26.10–06.11. */
const SPRINT = { endDate: '2026-11-06', startDate: '2026-10-26' };

const plan: QuarterlyPlanContent = {
  assignments: [
    { epicId: 'e1', id: 'a1', memberId: 'dev-1', startWeek: 3, weeks: 3 },
    { epicId: 'e2', id: 'a2', memberId: 'dev-2', startWeek: 5, weeks: 2 },
    // До спринта — не попадает.
    { epicId: 'e2', id: 'a3', memberId: 'dev-1', startWeek: 0, weeks: 2 },
    // Человек не из команды спринта и без задач в нём — не попадает.
    { epicId: 'e1', id: 'a4', memberId: 'dev-9', startWeek: 4, weeks: 1 },
  ],
  directions: [
    { id: 'd1', issueKey: 'PAY-1', teamId: 't1', title: 'Платежи' },
    { id: 'd2', teamId: 't1', title: 'Без ключа' },
  ],
  epics: [
    { directionId: 'd1', id: 'e1', issueKey: 'PAY-10', status: 'in_progress', title: 'Чекаут' },
    { directionId: 'd1', id: 'e2', issueKey: 'PAY-20', status: 'backlog', title: 'Возвраты' },
    { directionId: 'd2', id: 'e3', status: 'done', title: 'Ручной' },
  ],
  links: [],
  notes: [],
};

describe('planRowOfIssue (QK1)', () => {
  it('задача — сам эпик плана или его ребёнок', () => {
    expect(planRowOfIssue(plan, { key: 'PAY-10' })).toEqual({ directionId: 'd1', epicId: 'e1' });
    expect(planRowOfIssue(plan, { key: 'PAY-11', parentKey: 'PAY-10' })).toEqual({ directionId: 'd1', epicId: 'e1' });
  });

  it('ребёнок эпика направления без эпика плана — только направление', () => {
    expect(planRowOfIssue(plan, { key: 'PAY-99', parentKey: 'PAY-1' })).toEqual({ directionId: 'd1' });
    expect(planRowOfIssue(plan, { key: 'PAY-1' })).toEqual({ directionId: 'd1' });
  });

  it('эпик плана важнее направления; чужая задача — null', () => {
    expect(planRowOfIssue(plan, { key: 'PAY-20', parentKey: 'PAY-1' })).toEqual({ directionId: 'd1', epicId: 'e2' });
    expect(planRowOfIssue(plan, { key: 'OPS-1', parentKey: 'OPS-0' })).toBeNull();
  });
});

describe('buildSprintQuarterPlanView (QK2–QK4)', () => {
  const view = buildSprintQuarterPlanView({
    memberIds: new Set(['dev-1', 'dev-2']),
    memberNames: new Map([['dev-1', 'Аня']]),
    plan: { content: plan, ref: Q4, trackerEpics: { 'PAY-10': { done: false, statusDisplay: 'In progress', title: 'Чекаут v2' } }, version: 7 },
    sprintWindow: { endDate: `${SPRINT.endDate}T18:00:00.000Z`, startDate: SPRINT.startDate },
    tasks: [
      { assigneeId: 'dev-1', parentKey: 'PAY-10', taskId: 'PAY-11' },
      { assigneeId: 'dev-1', parentKey: 'PAY-1', taskId: 'PAY-12' },
      { assigneeId: 'dev-1', parentKey: null, taskId: 'OPS-5' },
      { assigneeId: 'dev-2', parentKey: 'PAY-10', taskId: 'PAY-13' },
    ],
  })!;

  it('берёт недели и назначения, которые задевает спринт, с датами', () => {
    expect(view.weeks.map((week) => week.index)).toEqual([4, 5]);
    expect(view.version).toBe(7);
    expect(view.assignments).toEqual([
      { endDate: '2026-11-06', epicId: 'e1', id: 'a1', memberId: 'dev-1', memberName: 'Аня', startDate: '2026-10-19', taskIds: ['PAY-11'] },
      { endDate: '2026-11-13', epicId: 'e2', id: 'a2', memberId: 'dev-2', startDate: '2026-11-02', taskIds: [] },
    ]);
  });

  it('строки плана — с названием и «готово» по трекеру', () => {
    expect(view.epics.map((epic) => [epic.id, epic.title, epic.done])).toEqual([
      ['e1', 'Чекаут v2', false],
      ['e2', 'Возвраты', false],
    ]);
    expect(view.directions.map((direction) => direction.id)).toEqual(['d1']);
  });

  it('работа вне плана: не свой эпик и не своё направление', () => {
    expect(view.tasks).toEqual([
      { directionId: 'd1', epicId: 'e1', taskId: 'PAY-11' },
      { directionId: 'd1', taskId: 'PAY-12' },
      { directionId: 'd1', epicId: 'e1', taskId: 'PAY-13' },
    ]);
    // PAY-12 — в направлении эпика Ани, это в плане; OPS-5 — нет. У dev-2 эпик e2, задача — e1 того же
    // направления: тоже в плане, но в taskIds его назначения не попадает.
    expect(view.outsidePlan).toEqual([{ assigneeId: 'dev-1', taskIds: ['OPS-5'] }]);
    expect(view.assignments.find((assignment) => assignment.id === 'a2')?.taskIds).toEqual([]);
  });

  it('непривязанному эпику идут задачи прямо под эпиком его направления, привязанному — нет', () => {
    const content: QuarterlyPlanContent = {
      ...plan,
      assignments: [
        { epicId: 'e1', id: 'linked', memberId: 'dev-1', startWeek: 4, weeks: 2 },
        { epicId: 'e4', id: 'unlinked', memberId: 'dev-1', startWeek: 4, weeks: 2 },
      ],
      epics: [...plan.epics, { directionId: 'd1', id: 'e4', status: 'in_progress', title: 'Без ключа' }],
    };
    const result = buildSprintQuarterPlanView({
      memberIds: new Set(['dev-1']),
      plan: { content, ref: Q4, trackerEpics: {}, version: 1 },
      sprintWindow: SPRINT,
      tasks: [
        { assigneeId: 'dev-1', parentKey: 'PAY-1', taskId: 'PAY-12' },
        // Задача чужого эпика того же направления непривязанному эпику не засчитывается.
        { assigneeId: 'dev-1', parentKey: 'PAY-20', taskId: 'PAY-21' },
        { assigneeId: 'dev-2', parentKey: 'PAY-1', taskId: 'PAY-14' },
      ],
    })!;
    expect(result.assignments.map((assignment) => [assignment.id, assignment.taskIds])).toEqual([
      ['linked', []],
      ['unlinked', ['PAY-12']],
    ]);
  });

  it('спринт вне квартала — null', () => {
    expect(
      buildSprintQuarterPlanView({
        memberIds: new Set(),
        plan: { content: plan, ref: Q4, trackerEpics: {}, version: 1 },
        sprintWindow: { endDate: '2027-01-15', startDate: '2027-01-04' },
        tasks: [],
      })
    ).toBeNull();
  });
});
