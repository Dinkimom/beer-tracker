import type { QuarterlyPlanContent, QuarterlyPlanSprint, QuarterlyPlanTeam } from './quarterlyPlanTypes';

import { describe, expect, it } from 'vitest';

import { collectUnsplitDirectionIds, deadlineSprintOfWeek, phaseDeadline } from './quarterlyPlanPhases';
import { buildQuarterWeeks } from './quarterWeeks';

/** Q4 2026: неделя 0 = 28.09–02.10, неделя 4 = 26.10–30.10. */
const weeks = buildQuarterWeeks({ quarter: 4, year: 2026 });

/** Двухнедельные спринты: недели 0–1, 2–3, 4–5. */
const sprints: QuarterlyPlanSprint[] = [
  { endDate: '2026-10-09T15:00:00.000Z', id: 1, name: 'S1', startDate: '2026-09-28T07:00:00.000Z' },
  { endDate: '2026-10-23', id: 2, name: 'S2', startDate: '2026-10-12' },
  { endDate: '2026-11-06', id: 3, name: 'S3', startDate: '2026-10-26' },
];

const content: QuarterlyPlanContent = {
  assignments: [
    { directionId: 'd1', id: 'research', memberId: 'ann', phase: 'discovery', startWeek: 0, weeks: 1 },
    { directionId: 'd1', id: 'research-2', memberId: 'bob', phase: 'discovery', startWeek: 1, weeks: 2 },
    { epicId: 'e1', id: 'build', memberId: 'ann', startWeek: 3, weeks: 2 },
    { epicId: 'e2', id: 'build-2', memberId: 'bob', startWeek: 4, weeks: 3 },
    { epicId: 'e1', id: 'spike', memberId: 'bob', phase: 'discovery', startWeek: 2, weeks: 1 },
    { directionId: 'd2', id: 'research-3', memberId: 'ann', phase: 'discovery', startWeek: 0, weeks: 2 },
  ],
  directions: [
    { id: 'd1', teamId: 't1', title: 'Checkout' },
    { id: 'd2', teamId: 't1', title: 'Promo' },
    { id: 'd3', teamId: 't1', title: 'Empty' },
  ],
  epics: [
    { directionId: 'd1', id: 'e1', status: 'backlog', title: 'API' },
    { directionId: 'd1', id: 'e2', status: 'backlog', title: 'UI' },
    { directionId: 'd2', id: 'e3', status: 'backlog', title: 'Rules' },
  ],
  links: [],
  notes: [],
};

function deadline(row: { id: string; kind: 'direction' | 'epic' }, phase: 'delivery' | 'discovery') {
  const result = phaseDeadline({ phase, plan: content, row, sprints, weeks });
  return result && { endDate: result.endDate, sprintId: result.sprint?.id ?? null, week: result.week };
}

describe('deadlineSprintOfWeek (QG3)', () => {
  it('спринт, который задевает неделю; время в датах спринта не мешает', () => {
    expect(deadlineSprintOfWeek(sprints, weeks[1]!)?.id).toBe(1);
    expect(deadlineSprintOfWeek(sprints, weeks[2]!)?.id).toBe(2);
  });

  it('из двух спринтов, делящих неделю, — тот, что кончается позже', () => {
    const split: QuarterlyPlanSprint[] = [
      { endDate: '2026-10-14', id: 1, name: 'S1', startDate: '2026-10-01' },
      { endDate: '2026-10-28', id: 2, name: 'S2', startDate: '2026-10-15' },
    ];
    expect(deadlineSprintOfWeek(split, weeks[2]!)?.id).toBe(2);
  });

  it('неделя вне спринтов — ближайший следующий; дальше спринтов нет — null', () => {
    const gap = [sprints[0]!, sprints[2]!];
    expect(deadlineSprintOfWeek(gap, weeks[2]!)?.id).toBe(3);
    expect(deadlineSprintOfWeek(sprints, weeks[8]!)).toBeNull();
  });
});

describe('phaseDeadline (QG3)', () => {
  it('срок — последняя неделя самой поздней полосы фазы и её срочный спринт', () => {
    expect(deadline({ id: 'e1', kind: 'epic' }, 'delivery')).toEqual({ endDate: '2026-11-06', sprintId: 3, week: 4 });
    expect(deadline({ id: 'e1', kind: 'epic' }, 'discovery')).toEqual({ endDate: '2026-10-23', sprintId: 2, week: 2 });
    expect(deadline({ id: 'd1', kind: 'direction' }, 'discovery')).toEqual({ endDate: '2026-10-23', sprintId: 2, week: 2 });
  });

  it('delivery направления — самый поздний срок его эпиков; проработка эпика в discovery направления не входит', () => {
    // e2 кончается на неделе 6 (09.11–13.11): спринтов там нет — срок проходит в пятницу недели.
    expect(deadline({ id: 'd1', kind: 'direction' }, 'delivery')).toEqual({ endDate: '2026-11-13', sprintId: null, week: 6 });
    expect(deadline({ id: 'd2', kind: 'direction' }, 'discovery')?.week).toBe(1);
  });

  it('нет полос фазы — срока нет', () => {
    expect(deadline({ id: 'e2', kind: 'epic' }, 'discovery')).toBeNull();
    expect(deadline({ id: 'd2', kind: 'direction' }, 'delivery')).toBeNull();
    expect(deadline({ id: 'd3', kind: 'direction' }, 'discovery')).toBeNull();
  });
});

describe('collectUnsplitDirectionIds (QG4)', () => {
  const team: QuarterlyPlanTeam = { boardId: 1, id: 't1', members: [], sprints, title: 'Team' };
  const plan = { ...content, teams: [team] };

  it('проработка кончилась, а delivery-полос нет ни у направления, ни у его эпиков', () => {
    // d2: проработка до недели 1, срочный спринт S1 кончается 09.10; эпик e3 без полос.
    expect(collectUnsplitDirectionIds(plan, weeks, '2026-10-10')).toEqual(['d2']);
  });

  it('пока срочный спринт идёт — сигнала нет', () => {
    expect(collectUnsplitDirectionIds(plan, weeks, '2026-10-09')).toEqual([]);
  });

  it('delivery-полоса в строке самого направления — фича в работе без разбивки, сигнала нет', () => {
    const own = {
      ...plan,
      assignments: [...plan.assignments, { directionId: 'd2', id: 'ship', memberId: 'ann', startWeek: 5, weeks: 1 }],
    };
    expect(collectUnsplitDirectionIds(own, weeks, '2026-12-01')).toEqual([]);
  });
});
