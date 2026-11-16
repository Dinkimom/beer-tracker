import type { QuarterlyPlanContent } from './quarterlyPlanTypes';

import { describe, expect, it } from 'vitest';

import { parseQuarterlyPlanContent } from './quarterlyPlanContentParse';
import {
  addDirection,
  addEpic,
  assignmentSpanFields,
  daySpanFields,
  daySpanOf,
  isLinkViolated,
  overlappingAssignments,
  overlapWeeks,
  removeEpic,
} from './quarterlyPlanLayout';
import { phaseDeadline } from './quarterlyPlanPhases';
import {
  epicRowIds,
  moveDirection,
  moveEpic,
  moveEpicError,
  rivalAssignments,
  tasksByEpic,
  topLevelEpics,
} from './quarterlyPlanRows';
import { buildQuarterWeeks, resolveDaySpan } from './quarterWeeks';

const epic = (id: string, directionId: string, parentEpicId?: string) => ({
  directionId,
  id,
  ...(parentEpicId ? { parentEpicId } : {}),
  status: 'backlog' as const,
  title: id,
});

const plan: QuarterlyPlanContent = {
  assignments: [
    { epicId: 'e1', id: 'a1', memberId: 'alice', startWeek: 0, weeks: 1 },
    { epicId: 't1', id: 'a2', memberId: 'alice', startWeek: 2, weeks: 2 },
  ],
  directions: [
    { id: 'd1', teamId: 'team1', title: 'Checkout' },
    { id: 'd2', teamId: 'team1', title: 'Search' },
    { id: 'd3', teamId: 'team2', title: 'Platform' },
  ],
  epics: [epic('e1', 'd1'), epic('t1', 'd1', 'e1'), epic('t2', 'd1', 'e1'), epic('e2', 'd1'), epic('e3', 'd2'), epic('e4', 'd3')],
  links: [],
  notes: [{ color: 'yellow', id: 'n1', row: { id: 't1', kind: 'epic' }, rows: 1, startWeek: 0, text: 'x', weeks: 1 }],
};
const ids = (content: QuarterlyPlanContent) => content.epics.map((row) => row.id);

describe('задачи эпика (QT1–QT3)', () => {
  it('эпики направления — без задач; задачи — по эпику-родителю', () => {
    expect(topLevelEpics(plan.epics, 'd1').map((row) => row.id)).toEqual(['e1', 'e2']);
    expect(tasksByEpic(plan.epics).get('e1')?.map((row) => row.id)).toEqual(['t1', 't2']);
    expect([...epicRowIds(plan.epics, 'e1')]).toEqual(['e1', 't1', 't2']);
  });

  it('эпик уходит вместе с задачами, их полосами и заметками; задача — одна', () => {
    const withoutEpic = removeEpic(plan, 'e1');
    expect(ids(withoutEpic)).toEqual(['e2', 'e3', 'e4']);
    expect(withoutEpic.assignments).toEqual([]);
    expect(withoutEpic.notes).toEqual([]);
    expect(ids(removeEpic(plan, 't1'))).toEqual(['e1', 't2', 'e2', 'e3', 'e4']);
  });

  it('срок эпика считает и полосы его задач', () => {
    const weeks = buildQuarterWeeks({ quarter: 4, year: 2026 });
    expect(phaseDeadline({ phase: 'delivery', plan, row: { id: 'e1', kind: 'epic' }, sprints: [], weeks })?.week).toBe(3);
  });

  it('план с задачей под задачей, под чужим направлением или без родителя не сохраняется', () => {
    const parse = (epics: QuarterlyPlanContent['epics']) =>
      parseQuarterlyPlanContent({ ...plan, assignments: [], epics, notes: [] }, { quarter: 4, year: 2026 });
    expect(parse(plan.epics).ok).toBe(true);
    expect(parse([epic('e1', 'd1'), epic('t1', 'd1', 'e1'), epic('t9', 'd1', 't1')])).toMatchObject({
      error: 'epic t9: parent t1 is a task itself',
    });
    expect(parse([epic('e1', 'd1'), epic('t1', 'd2', 'e1')])).toMatchObject({
      error: 'epic t1: not in the direction of its parent e1',
    });
    expect(parse([epic('t1', 'd1', 'gone')])).toMatchObject({ error: 'epic t1: unknown parent epic gone' });
  });
});

describe('порядок строк (QO1–QO3)', () => {
  it('новая строка встаёт под указанной, без неё — в конец', () => {
    expect(ids(addEpic(plan, epic('new', 'd1'), 'e1'))).toEqual(['e1', 'new', 't1', 't2', 'e2', 'e3', 'e4']);
    expect(ids(addEpic(plan, epic('new', 'd1'))).at(-1)).toBe('new');
    const direction = { id: 'dx', teamId: 'team1', title: 'New' };
    expect(addDirection(plan, direction, 'd1').directions.map((row) => row.id)).toEqual(['d1', 'dx', 'd2', 'd3']);
  });

  it('направление переставляется внутри своей команды', () => {
    expect(moveDirection(plan, 'd2', 'd1', 'before').directions.map((row) => row.id)).toEqual(['d2', 'd1', 'd3']);
    expect(moveDirection(plan, 'd1', 'd2', 'after').directions.map((row) => row.id)).toEqual(['d2', 'd1', 'd3']);
    expect(moveDirection(plan, 'd1', 'd3', 'after')).toBe(plan);
  });

  it('эпик встаёт рядом с эпиком и переезжает в его направление вместе с задачами', () => {
    expect(ids(moveEpic(plan, 'e2', 'e1', 'before'))).toEqual(['e2', 'e1', 't1', 't2', 'e3', 'e4']);
    const moved = moveEpic(plan, 'e1', 'e3', 'after');
    expect(topLevelEpics(moved.epics, 'd2').map((row) => row.id)).toEqual(['e3', 'e1']);
    expect(moved.epics.filter((row) => row.parentEpicId === 'e1').map((row) => row.directionId)).toEqual(['d2', 'd2']);
  });

  it('задача встаёт рядом с задачей и берёт её эпик', () => {
    const withTask = addEpic(plan, epic('t3', 'd1', 'e2'));
    const moved = moveEpic(withTask, 't1', 't3', 'before');
    expect(tasksByEpic(moved.epics).get('e2')?.map((row) => row.id)).toEqual(['t1', 't3']);
    expect(ids(moveEpic(plan, 't2', 't1', 'before'))).toEqual(['e1', 't2', 't1', 'e2', 'e3', 'e4']);
  });

  it('строка остаётся на своём уровне и в своей команде', () => {
    expect(moveEpicError(plan, 't1', 'e2')).toBe('an epic goes next to an epic and a task next to a task');
    expect(moveEpicError(plan, 'e1', 'e4')).toBe('rows of different teams');
    expect(moveEpicError(plan, 'e1', 'e1')).toBe('a row cannot be placed next to itself');
    expect(moveEpic(plan, 'e1', 'e4', 'after')).toBe(plan);
  });
});

describe('срок полосы в днях (QT5)', () => {
  const day = (id: string, startDay: number, days: number, epicId = 't1') => ({
    epicId,
    id,
    memberId: 'alice',
    ...daySpanFields({ days, startDay }),
  });

  it('дни задают недели, которые они задевают; без дней срок — целые недели', () => {
    expect(daySpanFields({ days: 2, startDay: 7 })).toEqual({ days: 2, startDay: 7, startWeek: 1, weeks: 1 });
    expect(daySpanFields({ days: 2, startDay: 9 })).toMatchObject({ startWeek: 1, weeks: 2 });
    expect(daySpanOf({ startWeek: 2, weeks: 2 })).toEqual({ days: 10, startDay: 10 });
    // Полоса на целые недели хранится неделями: дни снимаются.
    expect(assignmentSpanFields({ days: 10, startDay: 5 })).toEqual({ days: undefined, startDay: undefined, startWeek: 1, weeks: 2 });
    expect(assignmentSpanFields({ days: 3, startDay: 5 })).toEqual({ days: 3, startDay: 5, startWeek: 1, weeks: 1 });
  });

  it('задачи одной недели, идущие друг за другом, не пересекаются и порядок не нарушают', () => {
    const [first, second, third] = [day('a', 5, 2), day('b', 7, 1), day('c', 8, 1)];
    expect(overlappingAssignments(first!, [first!, second!, third!])).toEqual([]);
    expect(isLinkViolated(first!, second!)).toBe(false);
    expect(isLinkViolated(second!, first!)).toBe(true);
    expect(overlapWeeks(day('d', 5, 5, 't2'), [first!, second!, third!])).toEqual([]);
    expect(overlapWeeks(day('d', 5, 1, 't2'), [first!, day('e', 5, 3, 't3')])).toEqual([1]);
  });

  it('полоса эпика и полосы его задач — одна работа: друг другу не параллельны', () => {
    const epicBar = { epicId: 'e1', id: 'x', memberId: 'alice', startWeek: 1, weeks: 1 };
    const others = [day('a', 5, 2), day('b', 5, 2, 't2'), { ...epicBar, epicId: 'e2', id: 'y' }];
    expect(rivalAssignments(plan.epics)(epicBar, others).map((row) => row.id)).toEqual(['y']);
    expect(rivalAssignments(plan.epics)(others[0]!, [epicBar, others[1]!]).map((row) => row.id)).toEqual(['b']);
  });

  it('дни стоят у полосы любой строки — вместе со своими неделями', () => {
    const parse = (assignment: QuarterlyPlanContent['assignments'][number]) =>
      parseQuarterlyPlanContent({ ...plan, assignments: [assignment], notes: [] }, { quarter: 4, year: 2026 });
    expect(parse(day('a', 7, 2)).ok).toBe(true);
    expect(parse(day('a', 7, 2, 'e1')).ok).toBe(true);
    expect(parse({ ...day('a', 7, 2), startWeek: 0 })).toMatchObject({ error: 'assignment a: weeks do not match its days' });
    expect(parse({ ...day('a', 7, 2), days: undefined })).toMatchObject({ error: 'assignment a: startDay and days go together' });
  });

  it('даты периода дают рабочие дни квартала; выходные не в счёт', () => {
    const weeks = buildQuarterWeeks({ quarter: 4, year: 2026 });
    expect(resolveDaySpan(weeks, '2026-10-08', '2026-10-12')).toEqual({ days: 3, startDay: 8 });
    expect(resolveDaySpan(weeks, '2026-10-10', '2026-10-11')).toBeNull();
  });
});
