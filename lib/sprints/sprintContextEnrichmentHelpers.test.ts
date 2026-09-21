import { describe, expect, it } from 'vitest';

import {
  boardAffinityScore,
  buildSprintContextAgenda,
  buildSprintContextCalendarDays,
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

describe('collectSprintContextWarnings', () => {
  it('merges soft warnings with empty plan and unresolved assignees', () => {
    expect(
      collectSprintContextWarnings({
        emptyPlan: true,
        softWarnings: ['tracker_sprint_unavailable: x'],
        unresolvedAssigneeIds: ['staff:1', 'staff:2'],
      })
    ).toEqual([
      'tracker_sprint_unavailable: x',
      'empty_plan: no positions, notes, links, or goals in Beer Tracker for this sprint',
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
