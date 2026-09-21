import { describe, expect, it } from 'vitest';

import {
  buildPositionFromTrackerDates,
  mergeDbPositionsWithTrackerDateFallbacks,
  parseTrackerIsoDateOnlyLocal,
  trackerDatesToCellRange,
} from './trackerDatesToPlannedPosition';

const monday = new Date(2025, 0, 6); // 6 Jan 2025

describe('parseTrackerIsoDateOnlyLocal', () => {
  it('parses YYYY-MM-DD as local midnight', () => {
    const d = parseTrackerIsoDateOnlyLocal('2025-01-08');
    expect(d?.getFullYear()).toBe(2025);
    expect(d?.getMonth()).toBe(0);
    expect(d?.getDate()).toBe(8);
  });

  it('accepts datetime prefix', () => {
    expect(parseTrackerIsoDateOnlyLocal('2025-01-08T15:00:00.000+0300')?.getDate()).toBe(8);
  });
});

describe('trackerDatesToCellRange', () => {
  it('maps start to first timeslot and deadline to last timeslot of day', () => {
    // Mon 6 Jan → day 0; Wed 8 Jan → day 2
    const range = trackerDatesToCellRange({
      deadline: '2025-01-08',
      sprintStartDate: monday,
      start: '2025-01-06',
      task: { storyPoints: 5, team: 'Back' },
      workingDaysCount: 10,
    });
    expect(range).toEqual({ duration: 9, startDay: 0, startPart: 0 });
  });

  it('uses estimate duration when only start is set', () => {
    const range = trackerDatesToCellRange({
      sprintStartDate: monday,
      start: '2025-01-07',
      task: { storyPoints: 5, team: 'Back' },
      workingDaysCount: 10,
    });
    // SP 5 → 5 timeslots
    expect(range).toEqual({ duration: 5, startDay: 1, startPart: 0 });
  });

  it('anchors estimate at deadline last timeslot when only deadline is set', () => {
    const range = trackerDatesToCellRange({
      deadline: '2025-01-08',
      sprintStartDate: monday,
      task: { storyPoints: 3, team: 'Back' },
      workingDaysCount: 10,
    });
    // endCell = 2*3+3 = 9; duration 3 → startCell 6 → day 2 part 0
    expect(range).toEqual({ duration: 3, startDay: 2, startPart: 0 });
  });

  it('returns null when dates fall outside the sprint working days', () => {
    expect(
      trackerDatesToCellRange({
        deadline: '2024-12-01',
        sprintStartDate: monday,
        start: '2024-12-01',
        task: { storyPoints: 1, team: 'Back' },
        workingDaysCount: 10,
      })
    ).toBeNull();
  });
});

describe('mergeDbPositionsWithTrackerDateFallbacks', () => {
  it('keeps DB positions and fills gaps from tracker dates', () => {
    const db = new Map([
      [
        'KEEP-1',
        {
          assignee: 'dev-1',
          duration: 2,
          startDay: 4,
          startPart: 1,
          taskId: 'KEEP-1',
        },
      ],
    ]);
    const merged = mergeDbPositionsWithTrackerDateFallbacks({
      dbPositions: db,
      sprintStartDate: monday,
      tasks: [
        {
          id: 'KEEP-1',
          link: '',
          name: 'kept',
          start: '2025-01-06',
          deadline: '2025-01-08',
          assignee: 'dev-other',
          team: 'Back',
        },
        {
          id: 'NEW-1',
          link: '',
          name: 'from tracker',
          start: '2025-01-06',
          deadline: '2025-01-07',
          assignee: 'dev-2',
          team: 'Back',
        },
        {
          id: 'NO-DATES',
          link: '',
          name: 'sidebar',
          assignee: 'dev-2',
          team: 'Back',
        },
      ],
      workingDaysCount: 10,
    });

    expect(merged.get('KEEP-1')?.startDay).toBe(4);
    expect(merged.get('KEEP-1')?.assignee).toBe('dev-1');
    expect(merged.get('NEW-1')).toMatchObject({
      assignee: 'dev-2',
      duration: 6,
      plannedStartDay: 0,
      plannedStartPart: 0,
      startDay: 0,
      startPart: 0,
      taskId: 'NEW-1',
    });
    expect(merged.has('NO-DATES')).toBe(false);
  });

  it('skips tasks without assignee', () => {
    const merged = mergeDbPositionsWithTrackerDateFallbacks({
      dbPositions: new Map(),
      sprintStartDate: monday,
      tasks: [
        {
          id: 'NO-ASSIGNEE',
          link: '',
          name: 'x',
          start: '2025-01-06',
          deadline: '2025-01-06',
          team: 'Back',
        },
      ],
      workingDaysCount: 10,
    });
    expect(merged.size).toBe(0);
  });
});

describe('buildPositionFromTrackerDates', () => {
  it('sets planned baseline equal to display range', () => {
    const position = buildPositionFromTrackerDates({
      assigneeId: 'a1',
      deadline: '2025-01-06',
      sprintStartDate: monday,
      start: '2025-01-06',
      task: { id: 'T-1', storyPoints: 1, team: 'Back' },
      workingDaysCount: 10,
    });
    expect(position).toMatchObject({
      assignee: 'a1',
      duration: 3,
      plannedDuration: 3,
      plannedStartDay: 0,
      plannedStartPart: 0,
      startDay: 0,
      startPart: 0,
      taskId: 'T-1',
    });
  });
});
