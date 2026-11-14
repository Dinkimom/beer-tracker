import type { QuarterlyPlanContent } from './quarterlyPlanTypes';

import { describe, expect, it } from 'vitest';

import {
  absentDaysWithinSpan,
  addAssignment,
  addDirection,
  addEpic,
  addLink,
  addNote,
  applyBarDrag,
  areLinked,
  assignBarLanes,
  assignNoteLanes,
  buildWeekLoad,
  epicTitle,
  groupConsecutiveDays,
  isEpicDone,
  isLinkViolated,
  orderLinkEnds,
  overlappingAssignments,
  quarterNoteRowKey,
  removeAssignment,
  removeDirection,
  removeEpic,
  removeNote,
  removeLink,
  resizeNoteRows,
  trackerEpicOf,
  updateAssignment,
  updateDirection,
  updateEpic,
  updateNote,
  violatedBlockersByAssignment,
} from './quarterlyPlanLayout';

const WEEKS = 14;

describe('applyBarDrag', () => {
  it('двигает полосу и упирается в края квартала', () => {
    expect(applyBarDrag({ startWeek: 2, weeks: 3 }, 'move', 2, WEEKS)).toEqual({ startWeek: 4, weeks: 3 });
    expect(applyBarDrag({ startWeek: 2, weeks: 3 }, 'move', -9, WEEKS)).toEqual({ startWeek: 0, weeks: 3 });
    expect(applyBarDrag({ startWeek: 2, weeks: 3 }, 'move', 99, WEEKS)).toEqual({ startWeek: 11, weeks: 3 });
  });

  it('растягивает за правый край, не короче недели', () => {
    expect(applyBarDrag({ startWeek: 2, weeks: 2 }, 'end', 3, WEEKS)).toEqual({ startWeek: 2, weeks: 5 });
    expect(applyBarDrag({ startWeek: 2, weeks: 2 }, 'end', -5, WEEKS)).toEqual({ startWeek: 2, weeks: 1 });
    expect(applyBarDrag({ startWeek: 12, weeks: 1 }, 'end', 5, WEEKS)).toEqual({ startWeek: 12, weeks: 2 });
  });

  it('растягивает за левый край, конец остаётся на месте', () => {
    expect(applyBarDrag({ startWeek: 4, weeks: 2 }, 'start', -2, WEEKS)).toEqual({ startWeek: 2, weeks: 4 });
    expect(applyBarDrag({ startWeek: 4, weeks: 2 }, 'start', 9, WEEKS)).toEqual({ startWeek: 5, weeks: 1 });
  });
});

describe('assignBarLanes', () => {
  it('пересекающиеся полосы расходятся по дорожкам, соседние делят одну', () => {
    const { laneById, laneCount } = assignBarLanes([
      { id: 'a', startWeek: 0, weeks: 2 },
      { id: 'b', startWeek: 1, weeks: 2 },
      { id: 'c', startWeek: 2, weeks: 1 },
    ]);
    expect(laneCount).toBe(2);
    expect(laneById.get('a')).toBe(0);
    expect(laneById.get('b')).toBe(1);
    expect(laneById.get('c')).toBe(0);
  });

  it('пустая строка занимает одну дорожку', () => {
    expect(assignBarLanes([]).laneCount).toBe(1);
  });
});

describe('buildWeekLoad', () => {
  it('считает параллельные задачи по неделям', () => {
    const load = buildWeekLoad(
      [
        { id: 'a', epicId: 'i1', memberId: 'm', startWeek: 0, weeks: 2 },
        { id: 'b', epicId: 'i2', memberId: 'm', startWeek: 1, weeks: 2 },
      ],
      4
    );
    expect(load).toEqual([1, 2, 1, 0]);
  });
});

describe('absentDaysWithinSpan / groupConsecutiveDays', () => {
  it('берёт только дни отсутствия внутри назначения', () => {
    const absent = new Set([4, 5, 6, 7, 20]);
    expect(absentDaysWithinSpan({ startWeek: 1, weeks: 1 }, absent)).toEqual([5, 6, 7]);
    expect(absentDaysWithinSpan({ startWeek: 2, weeks: 1 }, absent)).toEqual([]);
  });

  it('склеивает подряд идущие дни', () => {
    expect(groupConsecutiveDays([5, 6, 7, 9])).toEqual([
      { dayCount: 3, startDay: 5 },
      { dayCount: 1, startDay: 9 },
    ]);
  });
});

describe('правки плана', () => {
  const plan: QuarterlyPlanContent = {
    assignments: [{ id: 'a', epicId: 'i1', memberId: 'm1', startWeek: 0, weeks: 1 }],
    directions: [{ id: 'e1', teamId: 't1', title: 'Direction' }],
    epics: [{ directionId: 'e1', id: 'i1', status: 'backlog', title: 'Epic' }],
    links: [],
    notes: [
      { color: 'yellow', id: 'n-team', row: { id: 't1', kind: 'team' }, rows: 2, startWeek: 0, text: 'Release', weeks: 2 },
      { color: 'blue', id: 'n-dir', row: { id: 'e1', kind: 'direction' }, rows: 1, startWeek: 1, text: 'Scope', weeks: 1 },
      { color: 'pink', id: 'n-epic', row: { id: 'i1', kind: 'epic' }, rows: 1, startWeek: 2, text: 'Contract', weeks: 1 },
    ],
  };

  it('меняет, добавляет и удаляет назначение, не трогая исходный план', () => {
    expect(updateAssignment(plan, 'a', { memberId: 'm2', weeks: 3 }).assignments[0]).toMatchObject({
      memberId: 'm2',
      weeks: 3,
    });
    const added = addAssignment(plan, { id: 'b', epicId: 'i1', memberId: 'm2', startWeek: 4, weeks: 1 });
    expect(added.assignments).toHaveLength(2);
    expect(removeAssignment(added, 'a').assignments.map((a) => a.id)).toEqual(['b']);
    expect(plan.assignments).toHaveLength(1);
  });

  it('меняет статус задачи и добавляет новую', () => {
    expect(updateEpic(plan, 'i1', { status: 'done' }).epics[0]!.status).toBe('done');
    expect(addEpic(plan, { directionId: 'e1', id: 'i2', status: 'backlog', title: 'New' }).epics).toHaveLength(2);
    expect(addDirection(plan, { id: 'e2', teamId: 't1', title: 'Second' }).directions).toHaveLength(2);
  });

  it('удаление задачи и эпика уносит их назначения', () => {
    expect(removeEpic(plan, 'i1')).toMatchObject({ assignments: [], epics: [] });
    expect(removeDirection(plan, 'e1')).toMatchObject({ assignments: [], directions: [], epics: [] });
    expect(updateDirection(plan, 'e1', { title: 'Renamed' }).directions[0]!.title).toBe('Renamed');
  });

  it('заметка живёт в строке: правится, переносится и уходит вместе со своей строкой', () => {
    const moved = updateNote(plan, 'n-team', { row: { id: 'i1', kind: 'epic' }, startWeek: 4 });
    expect(moved.notes[0]).toMatchObject({ row: { id: 'i1', kind: 'epic' }, startWeek: 4, text: 'Release' });
    expect(quarterNoteRowKey(moved.notes[0]!.row)).toBe('epic:i1');
    const added = addNote(plan, {
      color: 'green',
      id: 'n-new',
      row: { id: 't1', kind: 'absence' },
      rows: 2,
      startWeek: 3,
      text: 'On-call only',
      weeks: 1,
    });
    expect(removeNote(added, 'n-team').notes.map((note) => note.id)).toEqual(['n-dir', 'n-epic', 'n-new']);
    // Эпик уносит свою заметку, направление — свою и заметки своих эпиков; заметка команды остаётся.
    expect(removeEpic(plan, 'i1').notes.map((note) => note.id)).toEqual(['n-team', 'n-dir']);
    expect(removeDirection(plan, 'e1').notes.map((note) => note.id)).toEqual(['n-team']);
  });

  it('зависимость: блокирует раньше стоящее назначение, дубль не ставится, уходит с назначением', () => {
    const a = plan.assignments[0]!;
    const later = { id: 'b', epicId: 'i1', memberId: 'm2', startWeek: 3, weeks: 2 };
    const clash = { id: 'c', epicId: 'i1', memberId: 'm2', startWeek: 0, weeks: 2 };
    // Выбрали сначала позднее, потом раннее — блокирует всё равно раннее.
    expect(orderLinkEnds(later, a)).toEqual({ fromId: 'a', toId: 'b' });
    expect(orderLinkEnds(a, later)).toEqual({ fromId: 'a', toId: 'b' });
    // Сроки пересекаются — блокирует то, что выбрали первым.
    expect(orderLinkEnds(clash, a)).toEqual({ fromId: 'c', toId: 'a' });

    const two: QuarterlyPlanContent = { ...plan, assignments: [a, clash] };
    const linked = addLink(two, { fromId: 'a', id: 'l1', toId: 'c' });
    expect(areLinked(linked.links, 'c', 'a')).toBe(true);
    expect(addLink(linked, { fromId: 'c', id: 'l2', toId: 'a' }).links).toHaveLength(1);
    // «c» начинается на той же неделе, что и «a»: порядок нарушен.
    expect([...violatedBlockersByAssignment(linked).keys()]).toEqual(['c']);
    expect(isLinkViolated({ startWeek: 0, weeks: 1 }, { startWeek: 1, weeks: 2 })).toBe(false);
    expect(removeLink(linked, 'l1').links).toEqual([]);
    expect(removeAssignment(linked, 'c').links).toEqual([]);
    expect(removeEpic(linked, 'i1').links).toEqual([]);
  });

  it('находит пересечения только у того же человека и только по общим неделям', () => {
    const a = { id: 'a', epicId: 'i1', memberId: 'm1', startWeek: 2, weeks: 2 };
    const others = [
      a,
      { id: 'b', epicId: 'i2', memberId: 'm1', startWeek: 3, weeks: 1 },
      { id: 'c', epicId: 'i3', memberId: 'm1', startWeek: 4, weeks: 1 },
      { id: 'd', epicId: 'i4', memberId: 'm2', startWeek: 2, weeks: 2 },
    ];
    expect(overlappingAssignments(a, others).map((epic) => epic.id)).toEqual(['b']);
  });
});

describe('заметки: высота и дорожки', () => {
  it('высота держится в пределах от одной до четырёх дорожек', () => {
    expect(resizeNoteRows(2, 1)).toBe(3);
    expect(resizeNoteRows(2, -5)).toBe(1);
    expect(resizeNoteRows(3, 9)).toBe(4);
  });

  it('высокая заметка занимает несколько дорожек, соседи встают рядом или под ней', () => {
    const { laneById, laneCount } = assignNoteLanes([
      { id: 'tall', rows: 2, startWeek: 0, weeks: 3 },
      { id: 'under', rows: 1, startWeek: 1, weeks: 1 },
      { id: 'beside', rows: 2, startWeek: 3, weeks: 2 },
    ]);
    expect(Object.fromEntries(laneById)).toEqual({ beside: 0, tall: 0, under: 2 });
    expect(laneCount).toBe(3);
    expect(assignNoteLanes([]).laneCount).toBe(0);
  });

  it('низкая заметка встаёт в свободную дорожку рядом с высокой, а не под неё', () => {
    const { laneById, laneCount } = assignNoteLanes([
      { id: 'low', rows: 1, startWeek: 0, weeks: 2 },
      { id: 'tall', rows: 2, startWeek: 1, weeks: 2 },
      { id: 'fill', rows: 1, startWeek: 2, weeks: 1 },
    ]);
    expect(Object.fromEntries(laneById)).toEqual({ fill: 0, low: 0, tall: 1 });
    expect(laneCount).toBe(3);
  });

  it('заметка делит дорожку с полосой: рядом, если недели свободны, и ниже, если заняты', () => {
    const bar = { lane: 0, rows: 1, startWeek: 2, weeks: 3 };
    const { laneById } = assignNoteLanes(
      [
        { id: 'beside', rows: 1, startWeek: 0, weeks: 2 },
        { id: 'under', rows: 1, startWeek: 3, weeks: 1 },
        { id: 'tall-beside', rows: 2, startWeek: 5, weeks: 1 },
        { id: 'tall-clash', rows: 2, startWeek: 4, weeks: 1 },
      ],
      [bar]
    );
    expect(Object.fromEntries(laneById)).toEqual({ beside: 0, 'tall-beside': 0, 'tall-clash': 1, under: 1 });
  });
});

describe('привязка к эпику трекера (QE5, QE7, QE8)', () => {
  const trackerEpics = { 'DEMO-1': { done: true, statusDisplay: 'Closed', title: 'From tracker' } };

  it('привязанный эпик берёт название и готовность из трекера', () => {
    const epic = { issueKey: 'DEMO-1', status: 'backlog' as const, title: 'Own title' };
    expect(trackerEpicOf(epic, trackerEpics)?.statusDisplay).toBe('Closed');
    expect(epicTitle(epic, trackerEpics)).toBe('From tracker');
    expect(isEpicDone(epic, trackerEpics)).toBe(true);
  });

  it('без привязки или без ответа трекера — своё название и ручной статус', () => {
    expect(isEpicDone({ status: 'done' }, trackerEpics)).toBe(true);
    const missing = { issueKey: 'DEMO-9', status: 'in_progress' as const, title: 'Own' };
    expect(trackerEpicOf(missing, trackerEpics)).toBeNull();
    expect(epicTitle(missing, trackerEpics)).toBe('Own');
    expect(isEpicDone(missing, trackerEpics)).toBe(false);
  });
});
