import type { QuarterlyPlan, QuarterlyPlanTeam } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { describe, expect, it } from 'vitest';

import { collectQuarterlyPlanIssues } from '@/lib/quarterlyPlans/quarterlyPlanIssues';
import { buildQuarterWeeks } from '@/lib/quarterlyPlans/quarterWeeks';

import {
  absenceDatesAfterDrag,
  barDayMarks,
  buildAbsenceByMember,
  buildRowGoalFlags,
  formatSpanRange,
  formatWeekRange,
  layoutRowBars,
  layoutRowGoals,
  quarterBarToneClass,
  quarterRowHeightPx,
  sprintStartWeeks,
  freeDaysOfWeek,
} from './quarterlyPlanBoardModel';

const weeks = buildQuarterWeeks({ quarter: 4, year: 2026 });

const team: QuarterlyPlanTeam = {
  boardId: 1,
  id: 'team',
  members: [
    { id: 'ann', name: 'Ann', role: 'developer' },
    { id: 'bob', name: 'Bob', role: 'developer' },
  ],
  sprints: [],
  title: 'Team',
};

function event(patch: Partial<BoardAvailabilityEvent>): BoardAvailabilityEvent {
  return {
    endDate: '2026-10-09',
    eventType: 'vacation',
    id: 'e1',
    memberId: 'ann',
    memberName: 'Ann',
    startDate: '2026-10-07',
    ...patch,
  };
}

describe('buildAbsenceByMember', () => {
  it('кладёт отпуск на дни квартала: ср–пт второй недели — дни 7, 8, 9', () => {
    const absence = buildAbsenceByMember([team], new Map([[1, [event({})]]]), weeks);
    expect([...absence.get('ann')!.blockedDays]).toEqual([7, 8, 9]);
    expect(absence.get('ann')!.hatchKinds.get(7)).toBe('vacation');
    expect(absence.get('bob')!.segments).toEqual([]);
  });

  it('дежурство видно на таймлайне, но работе не мешает — это риск (QV3)', () => {
    const duty = event({ endDate: '2026-10-02', eventType: 'duty', startDate: '2026-09-28' });
    const absence = buildAbsenceByMember([team], new Map([[1, [duty]]]), weeks).get('ann')!;
    expect(absence.segments).toHaveLength(1);
    expect(absence.hatchKinds.get(0)).toBe('duty');
    expect(absence.blockedDays.size).toBe(0);
    expect([...absence.dutyDays]).toEqual([0, 1, 2, 3, 4]);
  });

  it('берёт события только своей доски и только своего человека', () => {
    const absence = buildAbsenceByMember([team], new Map([[2, [event({})]]]), weeks);
    expect(absence.get('ann')!.events).toEqual([]);
  });
});

describe('подписи и размеры', () => {
  it('неделя внутри месяца и на стыке месяцев', () => {
    expect(formatWeekRange(weeks[2]!)).toBe('12–16.10');
    expect(formatWeekRange(weeks[0]!)).toBe('28.09–02.10');
  });

  it('срок полосы — от понедельника первой недели до пятницы последней', () => {
    expect(formatSpanRange(weeks, { startWeek: 1, weeks: 3 })).toBe('05.10–23.10');
    expect(formatSpanRange(weeks, { startWeek: 99, weeks: 1 })).toBe('');
  });

  it('раскладка полос строки: дорожки, занятые дни и место в дорожках заметок', () => {
    const layout = layoutRowBars([
      { epicId: 'e1', id: 'a', memberId: 'ann', startWeek: 0, weeks: 2 },
      { epicId: 'e1', id: 'b', memberId: 'bob', startWeek: 1, weeks: 2 },
    ]);
    expect(layout.laneCount).toBe(2);
    expect(layout.occupiedDays.size).toBe(15);
    expect(layout.occupiedDays.has(14)).toBe(true);
    expect(layout.noteBlockers).toEqual([
      { lane: 0, rows: 1, startWeek: 0, weeks: 2 },
      { lane: 1, rows: 1, startWeek: 1, weeks: 2 },
    ]);
  });

  it('клетка добавления встаёт на самый длинный свободный отрезок недели (QT5)', () => {
    expect(freeDaysOfWeek(2, undefined)).toEqual({ days: 5, startDay: 10 });
    expect(freeDaysOfWeek(2, new Set([10, 11]))).toEqual({ days: 3, startDay: 12 });
    expect(freeDaysOfWeek(2, new Set([12]))).toEqual({ days: 2, startDay: 10 });
    expect(freeDaysOfWeek(2, new Set([10, 11, 12, 13, 14]))).toBeNull();
  });

  it('высота строки растёт с числом дорожек', () => {
    expect(quarterRowHeightPx(2) - quarterRowHeightPx(1)).toBe(28);
  });

  it('цвет полосы — по статусу строки; без статуса — как бэклог (QA9)', () => {
    expect(quarterBarToneClass('inprogress')).not.toBe(quarterBarToneClass('closed'));
    expect(quarterBarToneClass(undefined)).toBe(quarterBarToneClass('backlog'));
    expect(quarterBarToneClass('inprogress')).toMatch(/bg-.+ text-.+ border-/);
  });
});

describe('collectQuarterlyPlanIssues', () => {
  const plan: QuarterlyPlan = {
    sprintCards: {},
    assignments: [
      { epicId: 'e2', id: 'late', memberId: 'bob', startWeek: 6, weeks: 1 },
      { epicId: 'e2', id: 'bob-2', memberId: 'bob', startWeek: 2, weeks: 2 },
      { epicId: 'e1', id: 'ann-away', memberId: 'ann', startWeek: 1, weeks: 1 },
      { epicId: 'e1', id: 'bob-1', memberId: 'bob', startWeek: 3, weeks: 1 },
      { epicId: 'e1', id: 'bob-3', memberId: 'bob', startWeek: 3, weeks: 1 },
      { epicId: 'done', id: 'ann-done', memberId: 'ann', startWeek: 1, weeks: 1 },
    ],
    directions: [{ id: 'd1', teamId: 'team', title: 'D1' }],
    epics: [
      { directionId: 'd1', id: 'e1', status: 'backlog', title: 'E1' },
      { directionId: 'd1', id: 'e2', status: 'backlog', title: 'E2' },
      { directionId: 'd1', id: 'done', status: 'done', title: 'Done' },
    ],
    links: [{ fromId: 'bob-2', id: 'l1', toId: 'late' }],
    notes: [],
    quarter: 4,
    teams: [team],
    trackerEpics: {},
    year: 2026,
  };
  const absence = buildAbsenceByMember([team], new Map([[1, [event({})]]]), weeks);

  it('идёт в порядке доски и различает отсутствие и параллельный эпик', () => {
    const issues = collectQuarterlyPlanIssues(plan, absence, false);
    expect(issues.map((issue) => issue.assignmentId)).toEqual(['ann-away', 'bob-1', 'bob-3', 'bob-2', 'ann-done']);
    expect(issues[0]).toMatchObject({ away: true, directionId: 'd1', parallel: false, teamId: 'team' });
    expect(issues[1]).toMatchObject({ away: false, blocked: false, parallel: true });
  });

  it('полосы самого направления идут перед его эпиками и считаются так же (QG2)', () => {
    const withResearch: QuarterlyPlan = {
      ...plan,
      assignments: [
        ...plan.assignments,
        { directionId: 'd1', id: 'ann-research', memberId: 'ann', phase: 'discovery', startWeek: 1, weeks: 1 },
      ],
    };
    const issues = collectQuarterlyPlanIssues(withResearch, absence, false);
    expect(issues[0]).toMatchObject({ assignmentId: 'ann-research', away: true, directionId: 'd1', teamId: 'team' });
    expect(issues.map((issue) => issue.assignmentId).slice(1, 3)).toEqual(['ann-away', 'bob-1']);
  });

  it('нарушенный порядок — тоже проблема: зависимое назначение начинается до конца предшественника', () => {
    const early = { ...plan, links: [{ fromId: 'late', id: 'l2', toId: 'bob-1' }] };
    const issue = collectQuarterlyPlanIssues(early, absence, false).find((item) => item.assignmentId === 'bob-1');
    expect(issue).toMatchObject({ blocked: true });
  });

  it('со скрытыми готовыми не считает их строки', () => {
    const issues = collectQuarterlyPlanIssues(plan, absence, true);
    expect(issues.map((issue) => issue.assignmentId)).toEqual(['ann-away', 'bob-1', 'bob-3', 'bob-2']);
  });

  it('исполнитель ушёл из команды эпика — проблема, назначение остаётся (QI6)', () => {
    const gone = { ...plan, assignments: [{ epicId: 'e1', id: 'gone', memberId: 'staff:left', startWeek: 9, weeks: 1 }] };
    expect(collectQuarterlyPlanIssues(gone, absence, false)).toEqual([
      { assignmentId: 'gone', away: false, blocked: false, directionId: 'd1', notInTeam: true, parallel: false, teamId: 'team' },
    ]);
  });

  it('готовность привязанного эпика — по трекеру, а не по ручному статусу (QE8)', () => {
    const linked = {
      ...plan,
      epics: plan.epics.map((epic) =>
        epic.id === 'e2' ? { ...epic, issueKey: 'DEMO-2' } : epic.id === 'done' ? { ...epic, issueKey: 'DEMO-3' } : epic
      ),
      trackerEpics: {
        'DEMO-2': { done: true, statusDisplay: 'Closed', title: 'E2' },
        'DEMO-3': { done: false, statusDisplay: 'Open', title: 'Done' },
      },
    };
    const issues = collectQuarterlyPlanIssues(linked, absence, true);
    expect(issues.map((issue) => issue.assignmentId)).toEqual(['ann-away', 'bob-1', 'bob-3', 'ann-done']);
  });
});

describe('barDayMarks', () => {
  const absence = {
    blockedDays: new Set([5, 6]),
    dutyDays: new Set([6, 7, 8, 12]),
    events: [],
    hatchKinds: new Map(),
    segments: [],
  };

  it('штрихует отсутствие и параллельный эпик, точками — дежурство там, где нет штриховки (QV3)', () => {
    const bar = { epicId: 'e1', id: 'a1', memberId: 'ann', startWeek: 1, weeks: 2 };
    const other = { epicId: 'e2', id: 'a2', memberId: 'ann', startWeek: 2, weeks: 1 };
    const third = { epicId: 'e3', id: 'a3', memberId: 'ann', startWeek: 2, weeks: 1 };
    expect(barDayMarks(bar, absence, [bar, other, third])).toEqual({
      issues: [{ dayCount: 2, startDay: 5 }, { dayCount: 5, startDay: 10 }],
      risks: [{ dayCount: 2, startDay: 7 }],
    });
  });

  it('два эпика в неделю у человека — норма, не штрихуется (QI2)', () => {
    const bar = { epicId: 'e1', id: 'a1', memberId: 'bob', startWeek: 0, weeks: 2 };
    const other = { epicId: 'e2', id: 'a2', memberId: 'bob', startWeek: 1, weeks: 1 };
    expect(barDayMarks(bar, undefined, [bar, other])).toEqual({ issues: [], risks: [] });
  });

  it('без отсутствий и пересечений полоса чистая', () => {
    const bar = { epicId: 'e1', id: 'a1', memberId: 'bob', startWeek: 0, weeks: 1 };
    expect(barDayMarks(bar, undefined, [bar])).toEqual({ issues: [], risks: [] });
  });
});

describe('absenceDatesAfterDrag (QV4)', () => {
  // Отпуск 05.10–11.10 (кончается в воскресенье): на доске — дни 5–9.
  const event = { endDate: '2026-10-11', startDate: '2026-10-05' };
  const from = { days: 5, startDay: 5 };

  it('перенос сдвигает обе даты на рабочие дни квартала', () => {
    expect(absenceDatesAfterDrag({ event, from, to: { days: 5, startDay: 7 }, weeks })).toEqual({
      endDate: '2026-10-13',
      startDate: '2026-10-07',
    });
  });

  it('растягивание за один край не трогает дату другого', () => {
    expect(absenceDatesAfterDrag({ event, from, to: { days: 3, startDay: 7 }, weeks })).toEqual({
      endDate: '2026-10-11',
      startDate: '2026-10-07',
    });
    expect(absenceDatesAfterDrag({ event, from, to: { days: 2, startDay: 5 }, weeks })).toEqual({
      endDate: '2026-10-06',
      startDate: '2026-10-05',
    });
  });
});

describe('sprintStartWeeks', () => {
  it('недели начала спринтов по порядку; первая неделя квартала и спринты вне него границы не дают', () => {
    const sprints = [
      { endDate: '2026-10-23', startDate: '2026-10-12' },
      { endDate: '2026-10-09T15:00:00.000Z', startDate: '2026-09-28' },
      { endDate: '2026-09-25', startDate: '2026-09-14' },
    ];
    expect(sprintStartWeeks(sprints, weeks)).toEqual([2]);
  });
});

describe('buildRowGoalFlags (QG8)', () => {
  const Q4 = { quarter: 4, year: 2026 } as const;
  const link = (rowId: string, ref: { quarter: 1 | 2 | 3 | 4; year: number } = Q4) => ({ ...ref, rowId });
  const sprints = [
    // Недели 7–8 квартала.
    { endDate: '2026-11-29', id: 36, name: 'Sprint 36', startDate: '2026-11-15' },
    { endDate: '2027-01-15', id: 99, name: 'Next quarter', startDate: '2027-01-04' },
  ];
  const goals: Record<string, Array<{ checked: boolean; id: string; planRow?: ReturnType<typeof link> | null; text: string }>> = {
    '36:delivery': [
      { checked: true, id: 'g1', planRow: link('epic-1'), text: 'Ship A' },
      { checked: false, id: 'g2', planRow: link('epic-1'), text: 'Ship B' },
      { checked: false, id: 'g3', planRow: null, text: 'Влёт' },
      { checked: false, id: 'g4', planRow: link('epic-1', { quarter: 3, year: 2026 }), text: 'Чужой квартал' },
      { checked: false, id: 'g5', planRow: link('deleted-row'), text: 'Строку удалили' },
    ],
    '36:discovery': [{ checked: false, id: 'g6', planRow: link('direction-1'), text: 'Research' }],
    '99:delivery': [{ checked: false, id: 'g7', planRow: link('epic-1'), text: 'Вне квартала' }],
  };
  const flags = buildRowGoalFlags({
    goalsOf: (sprintId, goalType) => goals[`${sprintId}:${goalType}`],
    ref: Q4,
    rowIds: new Set(['epic-1', 'direction-1']),
    teams: [{ boardId: 7, sprints }],
    weeks,
  });

  it('цели одного типа одного спринта в строке — один флажок на неделях спринта', () => {
    expect(flags.get('epic-1')).toEqual([
      {
        boardId: 7,
        goals: [
          { done: true, id: 'g1', text: 'Ship A' },
          { done: false, id: 'g2', text: 'Ship B' },
        ],
        goalType: 'delivery',
        id: '36:delivery:epic-1',
        sprint: sprints[0],
        startWeek: 7,
        weeks: 2,
      },
    ]);
    expect(flags.get('direction-1')?.map((flag) => [flag.goalType, flag.goals.length])).toEqual([['discovery', 1]]);
  });

  it('влёт, чужой квартал, висячая привязка и спринт вне квартала флажка не дают', () => {
    expect([...flags.keys()].sort()).toEqual(['direction-1', 'epic-1']);
  });
});

describe('layoutRowGoals (QG8)', () => {
  const goals = [
    { id: 'delivery', startWeek: 7, weeks: 2 },
    // Тот же спринт, другой тип — вторая дорожка.
    { id: 'discovery', startWeek: 7, weeks: 2 },
  ];

  it('цели сверху, полосы сдвигаются под них', () => {
    const layout = layoutRowGoals(goals, [{ lane: 0, rows: 1, startWeek: 0, weeks: 3 }]);
    expect(layout.goalLaneCount).toBe(2);
    expect(layout.barsTopLanes).toBe(2);
    expect(layout.blockers.map((blocker) => blocker.lane)).toEqual([0, 1, 2]);
  });

  it('в строке без полос цели стоят с первой дорожки и строку под полосы не растят', () => {
    const layout = layoutRowGoals(goals.slice(0, 1));
    expect(layout.goalLaneCount).toBe(1);
    expect(layout.barsTopLanes).toBe(0);
    expect(layout.goalLanes.get('delivery')).toBe(0);
  });
});

