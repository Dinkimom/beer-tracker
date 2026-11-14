import type { QuarterlyPlan, QuarterlyPlanTeam } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { describe, expect, it } from 'vitest';

import { buildQuarterWeeks } from '@/lib/quarterlyPlans/quarterWeeks';

import {
  buildAbsenceByMember,
  buildToneByKey,
  collectQuarterlyPlanIssues,
  formatSpanRange,
  formatWeekRange,
  quarterRowHeightPx,
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

  it('дежурство видно на таймлайне, но работе над задачей не мешает', () => {
    const duty = event({ endDate: '2026-10-02', eventType: 'duty', startDate: '2026-09-28' });
    const absence = buildAbsenceByMember([team], new Map([[1, [duty]]]), weeks).get('ann')!;
    expect(absence.segments).toHaveLength(1);
    expect(absence.hatchKinds.get(0)).toBe('duty');
    expect(absence.blockedDays.size).toBe(0);
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

  it('высота строки растёт с числом дорожек', () => {
    expect(quarterRowHeightPx(2) - quarterRowHeightPx(1)).toBe(28);
  });

  it('цвет стабилен для ключа и повторяется по кругу', () => {
    const keys = Array.from({ length: 10 }, (_, index) => `k${index}`);
    const tones = buildToneByKey(keys);
    expect(tones.get('k0')).toBe(tones.get('k9'));
    expect(tones.get('k0')).not.toBe(tones.get('k1'));
  });
});

describe('collectQuarterlyPlanIssues', () => {
  const plan: QuarterlyPlan = {
    assignments: [
      { epicId: 'e2', id: 'late', memberId: 'bob', startWeek: 6, weeks: 1 },
      { epicId: 'e2', id: 'bob-2', memberId: 'bob', startWeek: 2, weeks: 2 },
      { epicId: 'e1', id: 'ann-away', memberId: 'ann', startWeek: 1, weeks: 1 },
      { epicId: 'e1', id: 'bob-1', memberId: 'bob', startWeek: 3, weeks: 1 },
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
    expect(issues.map((issue) => issue.assignmentId)).toEqual(['ann-away', 'bob-1', 'bob-2', 'ann-done']);
    expect(issues[0]).toMatchObject({ away: true, directionId: 'd1', parallel: true, teamId: 'team' });
    expect(issues[1]).toMatchObject({ away: false, blocked: false, parallel: true });
  });

  it('нарушенный порядок — тоже проблема: зависимое назначение начинается до конца предшественника', () => {
    const early = { ...plan, links: [{ fromId: 'late', id: 'l2', toId: 'bob-1' }] };
    const issue = collectQuarterlyPlanIssues(early, absence, false).find((item) => item.assignmentId === 'bob-1');
    expect(issue).toMatchObject({ blocked: true });
  });

  it('со скрытыми готовыми не считает их строки', () => {
    const issues = collectQuarterlyPlanIssues(plan, absence, true);
    expect(issues.map((issue) => issue.assignmentId)).toEqual(['ann-away', 'bob-1', 'bob-2']);
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
    expect(issues.map((issue) => issue.assignmentId)).toEqual(['ann-away', 'bob-1', 'ann-done']);
  });
});
