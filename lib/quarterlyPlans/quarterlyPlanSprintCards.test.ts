import { describe, expect, it } from 'vitest';

import { daySpanFields } from './quarterlyPlanLayout';
import { buildSprintCards, positionsInTrackerSprints, sprintCardDrift } from './quarterlyPlanSprintCards';
import { buildQuarterWeeks } from './quarterWeeks';

/** Q4 2026: день 0 — понедельник 28.09; спринт 13–24.10 начинается во вторник (день квартала 11). */
const weeks = buildQuarterWeeks({ quarter: 4, year: 2026 });
const sprint = { endDate: '2026-10-24', id: 102, name: 'Sprint 15', startDate: '2026-10-13' };
const card = (taskId: string, startDay: number, startPart: number, duration: number, sprintId = 102) => ({
  duration,
  sprintId,
  startDay,
  startPart,
  taskId,
});

describe('карточки задач на досках спринтов (QK8)', () => {
  it('срок карточки — её первый и последний рабочий день; выходные не в счёт', () => {
    const cards = buildSprintCards({ partsPerDay: 3, positions: [card('A-1', 3, 0, 12), card('A-2', 0, 2, 1)], sprints: [sprint] });
    expect(cards['A-1']).toEqual({
      endDate: '2026-10-21',
      sprintEndDate: '2026-10-24',
      sprintId: 102,
      sprintName: 'Sprint 15',
      sprintStartDate: '2026-10-13',
      startDate: '2026-10-16',
    });
    expect(cards['A-2']).toMatchObject({ endDate: '2026-10-13', startDate: '2026-10-13' });
  });

  it('разбитая карточка — от начала первого отрезка до конца последнего; за концом спринта — его последний день', () => {
    const split = { ...card('A-1', 0, 0, 2), segments: [{ duration: 1, startDay: 0, startPart: 0 }, { duration: 1, startDay: 4, startPart: 1 }] };
    const cards = buildSprintCards({ partsPerDay: 2, positions: [split, card('A-2', 8, 0, 20)], sprints: [sprint] });
    expect(cards['A-1']).toMatchObject({ endDate: '2026-10-19', startDate: '2026-10-13' });
    expect(cards['A-2']).toMatchObject({ endDate: '2026-10-23', startDate: '2026-10-23' });
  });

  it('задача на досках двух спринтов — берётся поздний', () => {
    const next = { endDate: '2026-11-07', id: 103, name: 'Sprint 16', startDate: '2026-10-27' };
    const cards = buildSprintCards({ partsPerDay: 3, positions: [card('A-1', 0, 0, 3, 103), card('A-1', 0, 0, 3)], sprints: [next, sprint] });
    expect(cards['A-1']).toMatchObject({ sprintId: 103, startDate: '2026-10-27' });
  });

  it('полоса по дням расходится, если карточка стоит не день в день', () => {
    const bar = { epicId: 't1', id: 'a', memberId: 'm', ...daySpanFields({ days: 2, startDay: 14 }) };
    const drift = (startDate: string, endDate: string) => sprintCardDrift({ assignments: [bar], card: { endDate, startDate }, weeks });
    expect(drift('2026-10-16', '2026-10-19')).toBeNull();
    expect(drift('2026-10-16', '2026-10-21')).toEqual({ days: 4, startDay: 14 });
    expect(drift('2026-10-19', '2026-10-19')).toEqual({ days: 1, startDay: 15 });
  });

  it('полоса неделями расходится, только когда карточка выходит за её недели', () => {
    const bar = { epicId: 't1', id: 'a', memberId: 'm', startWeek: 2, weeks: 1 };
    const drift = (startDate: string, endDate: string) => sprintCardDrift({ assignments: [bar], card: { endDate, startDate }, weeks });
    expect(drift('2026-10-13', '2026-10-15')).toBeNull();
    expect(drift('2026-10-16', '2026-10-19')).toEqual({ days: 2, startDay: 14 });
  });

  it('без полос, без карточки или с карточкой вне квартала сравнивать нечего', () => {
    const bar = { epicId: 't1', id: 'a', memberId: 'm', startWeek: 2, weeks: 1 };
    expect(sprintCardDrift({ assignments: [], card: { endDate: '2026-10-16', startDate: '2026-10-16' }, weeks })).toBeNull();
    expect(sprintCardDrift({ assignments: [bar], card: undefined, weeks })).toBeNull();
    expect(sprintCardDrift({ assignments: [bar], card: { endDate: '2026-09-10', startDate: '2026-09-09' }, weeks })).toBeNull();
  });
});

describe('карточки, которые подтверждает трекер (QK10)', () => {
  const next = { endDate: '2026-11-07', id: 103, name: 'Sprint 16', startDate: '2026-10-27' };

  it('агент перенёс задачу в трекере обратно в текущий спринт — старая карточка в следующем не в счёт', () => {
    // На досках Beer Tracker задача стоит в обоих спринтах; трекер держит её только в Sprint 15.
    const positions = [card('A-1', 0, 0, 2, 102), card('A-1', 1, 0, 2, 103)];
    const members = new Map([
      [102, new Set(['A-1'])],
      [103, new Set<string>()],
    ]);
    const cards = buildSprintCards({ partsPerDay: 2, positions: positionsInTrackerSprints(positions, members), sprints: [sprint, next] });
    expect(cards['A-1']?.sprintId).toBe(102);
  });

  it('задачу убрали из спринта в трекере — карточки нет, план её больше не показывает в спринте', () => {
    const positions = [card('A-1', 0, 0, 2, 102)];
    expect(positionsInTrackerSprints(positions, new Map([[102, new Set<string>()]]))).toEqual([]);
  });

  it('спринт, который трекер не отдал, карточки не теряет', () => {
    const positions = [card('A-1', 0, 0, 2, 102)];
    expect(positionsInTrackerSprints(positions, new Map())).toEqual(positions);
  });
});

