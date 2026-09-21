import type { SprintContextPayload } from './sprintContextTypes';

import { describe, expect, it } from 'vitest';

import { PARTS_PER_DAY } from '@/constants';

import {
  buildSprintContextCapacity,
  expandPositionOccupiedCells,
} from './sprintContextCapacity';

function basePayload(
  overrides: Partial<SprintContextPayload> = {}
): Pick<SprintContextPayload, 'availability' | 'meta' | 'positions'> {
  return {
    availability: [],
    meta: {
      legend: { day: 'd', part: 'p' },
      organizationId: 'org-1',
      schemaVersion: 2,
      sprintId: 1,
      calendarDays: [
        { date: '2026-09-07', day: 0 },
        { date: '2026-09-08', day: 1 },
      ],
    },
    positions: [],
    ...overrides,
  };
}

describe('expandPositionOccupiedCells', () => {
  it('walks parts then next day', () => {
    const cells = expandPositionOccupiedCells({
      duration: 2,
      startDay: 0,
      startPart: PARTS_PER_DAY - 1,
    });
    expect(cells).toEqual([
      { day: 0, part: PARTS_PER_DAY - 1 },
      { day: 1, part: 0 },
    ]);
  });

  it('uses segments when present', () => {
    expect(
      expandPositionOccupiedCells({
        duration: 99,
        segments: [
          { duration: 1, startDay: 0, startPart: 0 },
          { duration: 1, startDay: 1, startPart: 2 },
        ],
        startDay: 0,
        startPart: 0,
      })
    ).toEqual([
      { day: 0, part: 0 },
      { day: 1, part: 2 },
    ]);
  });
});

describe('buildSprintContextCapacity', () => {
  it('detects overlap cells and gaps', () => {
    const report = buildSprintContextCapacity(
      basePayload({
        positions: [
          {
            assigneeId: 'staff:a',
            assigneeName: 'Ada',
            duration: 1,
            isQa: false,
            plannedDuration: null,
            plannedStartDay: null,
            plannedStartPart: null,
            startDay: 0,
            startPart: 0,
            taskId: 'T-1',
          },
          {
            assigneeId: 'staff:a',
            assigneeName: 'Ada',
            duration: 1,
            isQa: false,
            plannedDuration: null,
            plannedStartDay: null,
            plannedStartPart: null,
            startDay: 0,
            startPart: 0,
            taskId: 'T-2',
          },
        ],
      })
    );

    expect(report.people).toHaveLength(1);
    expect(report.people[0]?.overlaps).toEqual([
      { cell: { day: 0, part: 0 }, date: '2026-09-07', taskIds: ['T-1', 'T-2'] },
    ]);
    expect(report.overloaded.some((row) => row.day === 0)).toBe(true);
    expect(report.people[0]?.gaps.length).toBe(PARTS_PER_DAY * 2 - 1);
    expect(report.summary).toContain('overlap');
  });

  it('marks work on unavailable days as overloaded', () => {
    const report = buildSprintContextCapacity(
      basePayload({
        availability: [
          {
            endDate: '2026-09-07',
            eventType: 'vacation',
            id: 'av-1',
            memberId: 'a',
            memberName: 'Ada',
            startDate: '2026-09-07',
          },
        ],
        positions: [
          {
            assigneeId: 'staff:a',
            assigneeName: 'Ada',
            duration: 1,
            isQa: false,
            plannedDuration: null,
            plannedStartDay: null,
            plannedStartPart: null,
            startDay: 0,
            startPart: 1,
            taskId: 'T-1',
          },
        ],
      })
    );

    expect(report.people[0]?.days[0]?.unavailable).toBe(true);
    expect(report.overloaded).toEqual([
      {
        assigneeId: 'staff:a',
        assigneeName: 'Ada',
        date: '2026-09-07',
        day: 0,
        loadParts: 1,
      },
    ]);
  });

  it('skips feature-draft assignees', () => {
    const report = buildSprintContextCapacity(
      basePayload({
        positions: [
          {
            assigneeId: 'feature-draft:1',
            duration: 1,
            isQa: false,
            plannedDuration: null,
            plannedStartDay: null,
            plannedStartPart: null,
            startDay: 0,
            startPart: 0,
            taskId: 'T-1',
          },
        ],
      })
    );
    expect(report.people).toEqual([]);
  });
});
