import type { QuarterlyPlan } from './quarterlyPlanTypes';

import { describe, expect, it } from 'vitest';

import { daySpanFields } from './quarterlyPlanLayout';
import { collectSprintDrifts, shiftSprintCard } from './quarterlyPlanSprintSync';
import { buildQuarterWeeks } from './quarterWeeks';

/** Q4 2026: день 0 — пн 28.09; спринт 13–24.10 (день 0 спринта — вт 13.10 = день 11 квартала). */
const weeks = buildQuarterWeeks({ quarter: 4, year: 2026 });
const sprint = { endDate: '2026-10-24', id: 102, name: 'Sprint 15', startDate: '2026-10-13' };
const task = (id: string, issueKey: string) => ({
  directionId: 'd1',
  id,
  issueKey,
  parentEpicId: 'e1',
  status: 'backlog' as const,
  title: id,
});
const bar = (id: string, epicId: string, startDay: number, days: number) => ({
  epicId,
  id,
  memberId: 'm',
  ...daySpanFields({ days, startDay }),
});

function planWith(patch: Partial<QuarterlyPlan>): QuarterlyPlan {
  return {
    assignments: [],
    directions: [{ id: 'd1', teamId: 't1', title: 'Checkout' }],
    epics: [{ directionId: 'd1', id: 'e1', status: 'backlog', title: 'API' }],
    links: [],
    notes: [],
    quarter: 4,
    sprintCards: {},
    teams: [{ boardId: 1, id: 't1', members: [], sprints: [sprint], title: 'Team' }],
    trackerEpics: {},
    year: 2026,
    ...patch,
  };
}

describe('синхронизация плана и спринта (QK9)', () => {
  it('расхождение даёт обе стороны: сдвиг карточки на день начала полосы и полосу на дни карточки', () => {
    const plan = planWith({
      assignments: [bar('a1', 't1', 14, 1)],
      epics: [{ directionId: 'd1', id: 'e1', status: 'backlog', title: 'API' }, task('t1', 'A-1')],
      sprintCards: { 'A-1': { endDate: '2026-10-21', sprintEndDate: '2026-10-24', sprintId: 102, sprintName: 'Sprint 15', sprintStartDate: '2026-10-13', startDate: '2026-10-19' } },
    });
    const [drift] = collectSprintDrifts(plan, weeks);
    expect(drift).toMatchObject({
      epicId: 't1',
      plan: { endDate: '2026-10-16', startDate: '2026-10-16' },
      toPlan: { assignmentId: 'a1', span: { days: 3, startDay: 15 } },
      toSprint: { startDay: 3 },
    });
  });

  it('без расхождения задачи в списке нет; фильтр по строке берёт задачи эпика и направления', () => {
    const card = { endDate: '2026-10-16', sprintEndDate: '2026-10-24', sprintId: 102, sprintName: 'Sprint 15', sprintStartDate: '2026-10-13', startDate: '2026-10-16' };
    const plan = planWith({
      assignments: [bar('a1', 't1', 14, 1), bar('a2', 't2', 11, 1)],
      epics: [{ directionId: 'd1', id: 'e1', status: 'backlog', title: 'API' }, task('t1', 'A-1'), task('t2', 'A-2')],
      sprintCards: { 'A-1': card, 'A-2': card },
    });
    expect(collectSprintDrifts(plan, weeks).map((drift) => drift.epicId)).toEqual(['t2']);
    expect(collectSprintDrifts(plan, weeks, new Set(['e1']))).toHaveLength(1);
    expect(collectSprintDrifts(plan, weeks, new Set(['d1']))).toHaveLength(1);
    expect(collectSprintDrifts(plan, weeks, new Set(['other']))).toHaveLength(0);
  });

  it('в спринт нельзя, если карточка уже начинается в день полосы: длину сдвиг не меняет', () => {
    const plan = planWith({
      assignments: [bar('a1', 't1', 14, 1)],
      epics: [{ directionId: 'd1', id: 'e1', status: 'backlog', title: 'API' }, task('t1', 'A-1')],
      sprintCards: { 'A-1': { endDate: '2026-10-19', sprintEndDate: '2026-10-24', sprintId: 102, sprintName: 'Sprint 15', sprintStartDate: '2026-10-13', startDate: '2026-10-16' } },
    });
    expect(collectSprintDrifts(plan, weeks)[0]?.toSprint).toEqual({ blocker: 'sameStart' });
  });

  it('в спринт нельзя, если начало полосы вне спринта карточки; в план — если полос несколько', () => {
    const plan = planWith({
      assignments: [bar('a1', 't1', 0, 1), bar('a2', 't1', 2, 1)],
      epics: [{ directionId: 'd1', id: 'e1', status: 'backlog', title: 'API' }, task('t1', 'A-1')],
      sprintCards: { 'A-1': { endDate: '2026-10-16', sprintEndDate: '2026-10-24', sprintId: 102, sprintName: 'Sprint 15', sprintStartDate: '2026-10-13', startDate: '2026-10-16' } },
    });
    const [drift] = collectSprintDrifts(plan, weeks);
    expect(drift?.toSprint).toEqual({ blocker: 'outsideSprint' });
    expect(drift?.toPlan).toEqual({ blocker: 'manyBars' });
  });

  it('сдвиг карточки двигает все отрезки на одно число дней, части и длина не меняются', () => {
    expect(shiftSprintCard({ duration: 4, startDay: 5, startPart: 1 }, 2)).toEqual({ duration: 4, startDay: 2, startPart: 1 });
    const split = {
      duration: 3,
      segments: [
        { duration: 1, startDay: 4, startPart: 2 },
        { duration: 2, startDay: 6, startPart: 0 },
      ],
      startDay: 4,
      startPart: 2,
    };
    expect(shiftSprintCard(split, 1)).toEqual({
      duration: 3,
      segments: [
        { duration: 1, startDay: 1, startPart: 2 },
        { duration: 2, startDay: 3, startPart: 0 },
      ],
      startDay: 1,
      startPart: 2,
    });
  });
});
