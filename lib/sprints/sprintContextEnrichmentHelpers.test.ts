import { describe, expect, it } from 'vitest';

import {
  boardAffinityScore,
  buildSprintContextAgenda,
  buildSprintContextCalendarDays,
  buildSprintContextWeekendDays,
  collectOffBoardUnplannedAssignees,
  collectSprintContextWarnings,
  parseStaffUuidFromAssigneeId,
} from './sprintContextEnrichmentHelpers';

describe('buildSprintContextCalendarDays', () => {
  it('maps weekdays only between sprint start and end', () => {
    expect(buildSprintContextCalendarDays('2026-09-07', '2026-09-11')).toEqual([
      { date: '2026-09-07', day: 0 },
      { date: '2026-09-08', day: 1 },
      { date: '2026-09-09', day: 2 },
      { date: '2026-09-10', day: 3 },
      { date: '2026-09-11', day: 4 },
    ]);
  });

  it('skips weekends', () => {
    const days = buildSprintContextCalendarDays('2026-09-11', '2026-09-14');
    expect(days.map((d) => d.date)).toEqual(['2026-09-11', '2026-09-14']);
  });
});

describe('buildSprintContextWeekendDays', () => {
  it('lists Saturday and Sunday inside the sprint window', () => {
    expect(buildSprintContextWeekendDays('2026-09-11', '2026-09-14')).toEqual([
      { date: '2026-09-12', weekday: 'saturday' },
      { date: '2026-09-13', weekday: 'sunday' },
    ]);
  });

  it('includes a weekend that is the sprint start and returns none for a weekday-only window', () => {
    expect(buildSprintContextWeekendDays('2026-10-18', '2026-10-19')).toEqual([
      { date: '2026-10-18', weekday: 'sunday' },
    ]);
    expect(buildSprintContextWeekendDays('2026-09-07', '2026-09-11')).toEqual([]);
  });
});

describe('buildSprintContextAgenda', () => {
  it('sorts by day/part and attaches calendar date', () => {
    const agenda = buildSprintContextAgenda(
      [
        {
          assigneeId: 'staff:1',
          assigneeName: 'Ada',
          duration: 2,
          isQa: false,
          plannedDuration: null,
          plannedStartDay: null,
          plannedStartPart: null,
          startDay: 1,
          startPart: 1,
          summary: 'Second',
          taskId: 'B-2',
        },
        {
          assigneeId: 'staff:1',
          assigneeName: 'Ada',
          duration: 1,
          isQa: false,
          plannedDuration: null,
          plannedStartDay: null,
          plannedStartPart: null,
          startDay: 1,
          startPart: 0,
          summary: 'First',
          taskId: 'B-1',
        },
      ],
      [{ date: '2026-09-08', day: 1 }]
    );
    expect(agenda.map((item) => item.taskId)).toEqual(['B-1', 'B-2']);
    expect(agenda[0]?.date).toBe('2026-09-08');
    expect(agenda[0]?.assigneeName).toBe('Ada');
  });
});

describe('parseStaffUuidFromAssigneeId', () => {
  it('parses staff:uuid ids', () => {
    expect(parseStaffUuidFromAssigneeId('staff:8ffc8985-0001-472e-84bc-cfae58dc283f')).toBe(
      '8ffc8985-0001-472e-84bc-cfae58dc283f'
    );
    expect(parseStaffUuidFromAssigneeId('plain')).toBeNull();
  });
});

describe('collectOffBoardUnplannedAssignees', () => {
  it('lists each tracker assignee with no swimlane once, skipping board people and unassigned', () => {
    expect(
      collectOffBoardUnplannedAssignees(
        [
          { assigneeId: '712020:abc', assigneeName: 'Nikita', summary: 'a', taskId: 'R-1' },
          { assigneeId: '712020:abc', assigneeName: 'Nikita', summary: 'b', taskId: 'R-2' },
          { assigneeId: 'tracker-ada', assigneeName: 'Ada', summary: 'c', taskId: 'R-3' },
          { assigneeId: null, summary: 'd', taskId: 'R-4' },
        ],
        {
          positions: [{ assigneeId: 'tracker-ada' }],
          teamMembers: [{ assigneeId: 'staff:11111111-1111-4111-8111-111111111111' }],
        }
      )
    ).toEqual(['712020:abc (Nikita)']);
  });

  it('stays silent without a team roster', () => {
    expect(
      collectOffBoardUnplannedAssignees(
        [{ assigneeId: '712020:abc', summary: 'a', taskId: 'R-1' }],
        { positions: [], teamMembers: [] }
      )
    ).toEqual([]);
  });
});

describe('collectSprintContextWarnings', () => {
  it('flags unplanned assignees that are not on the board', () => {
    expect(
      collectSprintContextWarnings({
        emptyPlan: false,
        offBoardAssignees: ['712020:abc (Nikita)'],
        softWarnings: [],
        unresolvedAssigneeIds: [],
      })[0]
    ).toMatch(/^unplanned_assignee_not_on_board: 712020:abc \(Nikita\)/);
  });

  it('merges soft warnings with empty plan and unresolved assignees', () => {
    expect(
      collectSprintContextWarnings({
        emptyPlan: true,
        softWarnings: ['tracker_sprint_unavailable: x'],
        unresolvedAssigneeIds: ['staff:1', 'staff:2'],
      })
    ).toEqual([
      'tracker_sprint_unavailable: x',
      'empty_plan: no positions, notes, links, or goals in Beer Tracker for this sprint (tracker issues not yet placed are in unplannedTasks)',
      'unresolved_assignees: staff:1, staff:2',
    ]);
  });
});

describe('boardAffinityScore', () => {
  it('prefers hits with dates and board name match', () => {
    const withDates = boardAffinityScore(
      { boardName: 'Team 1', endDate: '2026-09-21', startDate: '2026-09-07' },
      'Team 1 Sprint 31'
    );
    const withoutDates = boardAffinityScore(
      { boardName: 'AQA board', endDate: '', startDate: '' },
      'Team 1 Sprint 31'
    );
    expect(withDates).toBeGreaterThan(withoutDates);
  });
});
