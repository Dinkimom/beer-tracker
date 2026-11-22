import type { QuarterlyPlan, QuarterlyPlanAssignment } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { describe, expect, it } from 'vitest';

import { buildQuarterWeeks } from '@/lib/quarterlyPlans/quarterWeeks';

import { QuarterPlanView } from './quarterPlanView';

const weeks = buildQuarterWeeks({ quarter: 4, year: 2026 });
const bar = (id: string, patch: Partial<QuarterlyPlanAssignment>): QuarterlyPlanAssignment => ({
  id,
  memberId: 'ann',
  startWeek: 2,
  weeks: 2,
  ...patch,
});

function planWith(patch: Partial<QuarterlyPlan> = {}): QuarterlyPlan {
  return {
    assignments: [],
    directions: [{ id: 'd1', teamId: 't1', title: 'Checkout' }],
    epics: [
      { directionId: 'd1', id: 'e1', status: 'backlog', title: 'API' },
      { directionId: 'd1', id: 'task', parentEpicId: 'e1', status: 'backlog', title: 'Endpoint' },
      { directionId: 'd1', id: 'e2', status: 'backlog', title: 'UI' },
    ],
    links: [],
    notes: [],
    quarter: 4,
    sprintCards: {},
    teams: [
      {
        boardId: 1,
        id: 't1',
        members: [
          { id: 'ann', name: 'Ann', role: 'developer' },
          { id: 'bob', name: 'Bob', role: 'developer' },
        ],
        sprints: [],
        title: 'Team',
      },
    ],
    trackerEpics: {},
    year: 2026,
    ...patch,
  };
}

function viewOf(plan: QuarterlyPlan, planAfterDraft = plan) {
  return new QuarterPlanView({
    eventsByBoard: new Map(),
    hideDone: false,
    now: new Date('2026-10-16T12:00:00'),
    plan,
    planAfterDraft,
    weeks,
  });
}

describe('QuarterPlanView', () => {
  it('полосы по строкам: у эпика в дереве — и полосы его задач, у задачи — только свои', () => {
    const view = viewOf(
      planWith({ assignments: [bar('a-epic', { epicId: 'e1' }), bar('a-task', { epicId: 'task' }), bar('a-dir', { directionId: 'd1' })] })
    );
    expect(view.assignmentsByEpic.get('e1')?.map((item) => item.id)).toEqual(['a-epic']);
    expect(view.assignmentsByEpicTree.get('e1')?.map((item) => item.id)).toEqual(['a-epic', 'a-task']);
    expect(view.assignmentsByEpicTree.get('task')?.map((item) => item.id)).toEqual(['a-task']);
    expect(view.assignmentsByDirection.get('d1')?.map((item) => item.id)).toEqual(['a-dir']);
    expect(view.tasksByEpic.get('e1')?.map((item) => item.id)).toEqual(['task']);
  });

  it('значение считается один раз на экземпляр', () => {
    const view = viewOf(planWith({ assignments: [bar('a1', { epicId: 'e1' })] }));
    expect(view.assignmentsByEpic).toBe(view.assignmentsByEpic);
    expect(view.issues).toBe(view.issues);
  });

  it('текущая неделя и число дней квартала', () => {
    const view = viewOf(planWith());
    expect(view.currentWeek).toBe(2);
    expect(view.dayCount).toBe(weeks.length * 5);
  });

  it('проблемы — по плану после черновика: убранное черновиком в счёт не идёт', () => {
    const overlapping = [bar('a1', { epicId: 'e1' }), bar('a2', { epicId: 'e2' }), bar('a3', { directionId: 'd1' })];
    const shown = planWith({ assignments: overlapping });
    const afterDraft = planWith({ assignments: overlapping.slice(0, 1) });
    expect(viewOf(shown).issueCounts.total).toBeGreaterThan(0);
    expect(viewOf(shown, afterDraft).issueCounts.total).toBe(0);
    expect(viewOf(shown, afterDraft).issueCountByTeam.size).toBe(0);
  });

  it('человек не из команды эпика — в notInTeam', () => {
    const view = viewOf(planWith({ assignments: [bar('a1', { epicId: 'e1', memberId: 'gone' })] }));
    expect([...view.notInTeamAssignmentIds]).toEqual(['a1']);
    expect(view.issueCountByTeam.get('t1')).toBe(1);
  });

  it('методы работают после деструктуризации, как их берут компоненты', () => {
    const plan = planWith({
      assignments: [bar('a1', { epicId: 'e1' }), bar('a2', { epicId: 'task' }), bar('a3', { epicId: 'e2' })],
    });
    const { rivalAssignmentsOf, rowTitleOf } = viewOf(plan);
    expect(rowTitleOf({ epicId: 'e2' })).toBe('UI');
    expect(rowTitleOf({ directionId: 'd1' })).toBe('Checkout');
    // Полоса задачи — та же работа, что эпик (QT3): её среди соперников нет; саму полосу отсекает проверка перегрузки.
    expect(rivalAssignmentsOf(plan.assignments[0]).map((item) => item.id)).toEqual(['a1', 'a3']);
  });
});
