import type { YtrackerBurndownIssue } from '@/lib/ytrackerRawIssues';

import { describe, expect, it } from 'vitest';

import { toBurndownDateKey } from './burndownFromChangelogReplay';
import { computeBurndownFromChangelog } from './computeBurndownFromChangelog';
import {
  buildSprintChangelogTimelineByDay,
  buildTaskChangelogTimelineByDay,
  computeSprintTimelineTotals,
  parseChangelogEntryToTimelineItems,
  rollupTaskDayEventsForEndOfDayView,
  rollupTaskDayReestimatesToOne,
} from './taskChangelogTimeline';

function issue(overrides: Partial<YtrackerBurndownIssue>): YtrackerBurndownIssue {
  return {
    issueKey: 'CM-1',
    changelog: [],
    rawChangelog: [],
    statusKey: 'inprogress',
    storyPoints: 5,
    testPoints: 3,
    inCurrentSprint: true,
    ...overrides,
  };
}

describe('parseChangelogEntryToTimelineItems', () => {
  const sprintName = 'Sprint A';
  const sprintId = '42';

  it('фиксирует добавление в спринт', () => {
    const entry = {
      updatedAt: '2025-06-10T12:00:00.000Z',
      fields: [
        {
          field: { id: 'sprint' },
          from: [],
          to: [{ display: sprintName, id: sprintId }],
        },
      ],
    };
    const items = parseChangelogEntryToTimelineItems(entry, 'CM-1', sprintName, sprintId);
    expect(items).toContainEqual({ type: 'sprint_added', issueKey: 'CM-1' });
  });

  it('фиксирует снятие со спринта', () => {
    const entry = {
      updatedAt: '2025-06-10T12:00:00.000Z',
      fields: [
        {
          field: { id: 'sprint' },
          from: [{ display: sprintName, id: sprintId }],
          to: [],
        },
      ],
    };
    const items = parseChangelogEntryToTimelineItems(entry, 'CM-1', sprintName, sprintId);
    expect(items).toContainEqual({ type: 'sprint_removed', issueKey: 'CM-1' });
  });

  it('сводит SP/TP в одну переоценку за запись', () => {
    const entry = {
      updatedAt: '2025-06-10T12:00:00.000Z',
      fields: [
        { field: { id: 'storyPoints' }, from: 3, to: 5 },
        { field: { id: 'testPoints' }, from: 1, to: 4 },
      ],
    };
    const items = parseChangelogEntryToTimelineItems(entry, 'X', sprintName, sprintId);
    expect(items).toEqual([
      { type: 'reestimated', issueKey: 'X', deltaSP: 2, deltaTP: 3 },
    ]);
  });

  it('отдаёт смену статуса (не только done)', () => {
    const entry = {
      updatedAt: '2025-06-10T12:00:00.000Z',
      fields: [
        {
          field: { id: 'status' },
          from: { key: 'inprogress' },
          to: { key: 'review' },
        },
      ],
    };
    const items = parseChangelogEntryToTimelineItems(entry, 'CM-1', sprintName, sprintId);
    expect(items).toEqual([
      { type: 'status_change', issueKey: 'CM-1', fromKey: 'inprogress', toKey: 'review' },
    ]);
  });

  it('IssueWorkflow: статус из объектов с id/key', () => {
    const entry = {
      type: 'IssueWorkflow',
      updatedAt: '2025-06-10T12:00:00.000Z',
      fields: [
        {
          field: { id: 'status' },
          from: { id: '1', key: 'backlog', display: 'Backlog' },
          to: { id: '2', key: 'inprogress', display: 'In Progress' },
        },
      ],
    };
    const items = parseChangelogEntryToTimelineItems(entry, 'CM-1', sprintName, sprintId);
    expect(items[0]).toMatchObject({
      type: 'status_change',
      fromKey: 'backlog',
      toKey: 'inprogress',
    });
  });
});

describe('buildTaskChangelogTimelineByDay', () => {
  const sprintName = 'My Sprint';
  const sprintId = '1';

  it('собирает по дням: спринт, переоценка, статусы — одна группа на задачу за день', () => {
    const yt = issue({
      issueKey: 'CM-99',
      rawChangelog: [
        {
          id: 'a',
          updatedAt: '2025-06-03T10:00:00.000Z',
          fields: [
            {
              field: { id: 'sprint' },
              from: [],
              to: [{ display: sprintName, id: sprintId }],
            },
          ],
        },
        {
          id: 'b',
          updatedAt: '2025-06-05T14:00:00.000Z',
          fields: [
            { field: { id: 'storyPoints' }, from: 5, to: 8 },
            { field: { id: 'testPoints' }, from: 2, to: 2 },
          ],
        },
        {
          id: 'c',
          updatedAt: '2025-06-07T09:00:00.000Z',
          fields: [
            {
              field: { id: 'status' },
              from: { key: 'inprogress' },
              to: { key: 'rc' },
            },
          ],
        },
      ],
    });

    const days = buildTaskChangelogTimelineByDay(yt, { sprintName, sprintId });

    expect(days.map((d) => d.dateKey)).toEqual([
      toBurndownDateKey(new Date('2025-06-03T10:00:00.000Z')),
      toBurndownDateKey(new Date('2025-06-05T14:00:00.000Z')),
      toBurndownDateKey(new Date('2025-06-07T09:00:00.000Z')),
    ]);

    expect(days[0].tasks).toEqual([
      { issueKey: 'CM-99', events: [{ type: 'sprint_added', issueKey: 'CM-99' }] },
    ]);

    expect(days[1].tasks).toEqual([
      {
        issueKey: 'CM-99',
        events: [{ type: 'reestimated', issueKey: 'CM-99', deltaSP: 3, deltaTP: 0 }],
      },
    ]);

    expect(days[2].tasks).toEqual([
      {
        issueKey: 'CM-99',
        events: [{ type: 'status_change', issueKey: 'CM-99', fromKey: 'inprogress', toKey: 'rc' }],
      },
    ]);
  });

  it('несколько записей одного дня — одна группа, события по времени', () => {
    const yt = issue({
      rawChangelog: [
        {
          id: '1',
          updatedAt: '2025-06-10T10:00:00.000Z',
          fields: [
            {
              field: { id: 'status' },
              from: { key: 'backlog' },
              to: { key: 'inprogress' },
            },
          ],
        },
        {
          id: '2',
          updatedAt: '2025-06-10T16:00:00.000Z',
          fields: [{ field: { id: 'storyPoints' }, from: 1, to: 3 }],
        },
      ],
    });

    const days = buildTaskChangelogTimelineByDay(yt, { sprintName, sprintId });
    expect(days).toHaveLength(1);
    expect(days[0].dateKey).toBe(toBurndownDateKey(new Date('2025-06-10T10:00:00.000Z')));
    expect(days[0].tasks).toEqual([
      {
        issueKey: 'CM-1',
        events: [
          { type: 'status_change', issueKey: 'CM-1', fromKey: 'backlog', toKey: 'inprogress' },
          { type: 'reestimated', issueKey: 'CM-1', deltaSP: 2, deltaTP: 0 },
        ],
      },
    ]);
  });

  it('учитывает окно по времени (как окно спринта)', () => {
    const yt = issue({
      rawChangelog: [
        {
          updatedAt: '2025-06-01T12:00:00.000Z',
          fields: [{ field: { id: 'storyPoints' }, from: 1, to: 2 }],
        },
        {
          updatedAt: '2025-06-10T12:00:00.000Z',
          fields: [{ field: { id: 'storyPoints' }, from: 2, to: 5 }],
        },
      ],
    });

    const windowStart = new Date('2025-06-05T00:00:00.000Z').getTime();
    const windowEnd = new Date('2025-06-15T23:59:59.999Z').getTime();

    const days = buildTaskChangelogTimelineByDay(yt, {
      sprintName,
      sprintId,
      windowStartMs: windowStart,
      windowEndMs: windowEnd,
    });

    expect(days).toHaveLength(1);
    expect(days[0].dateKey).toBe(toBurndownDateKey(new Date('2025-06-10T12:00:00.000Z')));
  });
});

describe('rollupTaskDayReestimatesToOne', () => {
  it('суммирует несколько переоценок за день в одну', () => {
    const rolled = rollupTaskDayReestimatesToOne([
      { type: 'reestimated', issueKey: 'X', deltaSP: 1, deltaTP: 0 },
      { type: 'status_change', issueKey: 'X', fromKey: 'a', toKey: 'b' },
      { type: 'reestimated', issueKey: 'X', deltaSP: 2, deltaTP: 1 },
    ]);
    expect(rolled).toEqual([
      { type: 'reestimated', issueKey: 'X', deltaSP: 3, deltaTP: 1 },
      { type: 'status_change', issueKey: 'X', fromKey: 'a', toKey: 'b' },
    ]);
  });
});

describe('rollupTaskDayEventsForEndOfDayView', () => {
  it('даёт компактный итог дня: нетто SP/TP и один статус backlog→rc', () => {
    const compact = rollupTaskDayEventsForEndOfDayView([
      { type: 'reestimated', issueKey: 'Z', deltaSP: 1, deltaTP: 0 },
      { type: 'status_change', issueKey: 'Z', fromKey: 'backlog', toKey: 'inprogress' },
      { type: 'status_change', issueKey: 'Z', fromKey: 'inprogress', toKey: 'rc' },
      { type: 'reestimated', issueKey: 'Z', deltaSP: 2, deltaTP: 1 },
    ]);
    expect(compact).toEqual([
      { type: 'reestimated', issueKey: 'Z', deltaSP: 3, deltaTP: 1 },
      { type: 'status_change', issueKey: 'Z', fromKey: 'backlog', toKey: 'rc' },
    ]);
  });
});

describe('buildSprintChangelogTimelineByDay', () => {
  const sprintName = 'Sprint A';
  const sprintId = '99';

  it('несколько задач — по одной группе на задачу за день', () => {
    const a = issue({
      issueKey: 'CM-A',
      rawChangelog: [
        {
          id: 'a1',
          updatedAt: '2025-06-10T09:00:00.000Z',
          fields: [
            {
              field: { id: 'status' },
              from: { key: 'backlog' },
              to: { key: 'inprogress' },
            },
          ],
        },
      ],
    });
    const b = issue({
      issueKey: 'CM-B',
      rawChangelog: [
        {
          id: 'b1',
          updatedAt: '2025-06-10T11:00:00.000Z',
          fields: [{ field: { id: 'storyPoints' }, from: 1, to: 5 }],
        },
      ],
    });

    const days = buildSprintChangelogTimelineByDay([a, b], { sprintName, sprintId });

    expect(days).toHaveLength(1);
    expect(days[0].dateKey).toBe(toBurndownDateKey(new Date('2025-06-10T09:00:00.000Z')));
    expect(days[0].tasks).toEqual([
      {
        issueKey: 'CM-A',
        events: [
          { type: 'status_change', issueKey: 'CM-A', fromKey: 'backlog', toKey: 'inprogress' },
        ],
      },
      {
        issueKey: 'CM-B',
        events: [{ type: 'reestimated', issueKey: 'CM-B', deltaSP: 4, deltaTP: 0 }],
      },
    ]);
  });

  it('при одинаковом времени сортирует группы задач по ключу', () => {
    const a = issue({
      issueKey: 'CM-Z',
      rawChangelog: [
        {
          id: 'z',
          updatedAt: '2025-06-10T12:00:00.000Z',
          fields: [{ field: { id: 'storyPoints' }, from: 1, to: 2 }],
        },
      ],
    });
    const b = issue({
      issueKey: 'CM-A',
      rawChangelog: [
        {
          id: 'a',
          updatedAt: '2025-06-10T12:00:00.000Z',
          fields: [{ field: { id: 'storyPoints' }, from: 1, to: 3 }],
        },
      ],
    });

    const days = buildSprintChangelogTimelineByDay([a, b], { sprintName, sprintId });
    expect(days[0].tasks.map((t) => t.issueKey)).toEqual(['CM-A', 'CM-Z']);
  });

  it('совпадает с buildTaskChangelogTimelineByDay для одной задачи', () => {
    const yt = issue({
      issueKey: 'CM-1',
      rawChangelog: [
        {
          id: '1',
          updatedAt: '2025-06-11T10:00:00.000Z',
          fields: [{ field: { id: 'testPoints' }, from: 0, to: 2 }],
        },
      ],
    });

    const one = buildTaskChangelogTimelineByDay(yt, { sprintName, sprintId });
    const sprint = buildSprintChangelogTimelineByDay([yt], { sprintName, sprintId });
    expect(sprint).toEqual(one);
  });
});

describe('computeSprintTimelineTotals', () => {
  const sprintStartDate = new Date('2025-06-02T08:00:00.000Z');
  const sprintEndDate = new Date('2025-06-15T18:00:00.000Z');
  const sprintStartTime = sprintStartDate.getTime();
  const sprintEndTime = sprintEndDate.getTime();

  const windowOpts = {
    sprintName: 'S',
    sprintId: undefined as string | undefined,
    sprintStartTime,
    windowStartMs: sprintStartTime,
    windowEndMs: sprintEndTime,
  };

  it('после закрытия задачи весь объём в done, остаток 0', () => {
    const yt = issue({
      storyPoints: 5,
      testPoints: 2,
      rawChangelog: [
        {
          updatedAt: '2025-06-10T12:00:00.000Z',
          fields: [
            {
              field: { id: 'status' },
              from: { key: 'inprogress' },
              to: { key: 'closed' },
            },
          ],
        },
      ],
    });

    const t = computeSprintTimelineTotals([yt], windowOpts);
    expect(t.totalSP).toBe(5);
    expect(t.totalTP).toBe(2);
    expect(t.doneSP).toBe(5);
    expect(t.doneTP).toBe(2);
    expect(t.remainingSP).toBe(0);
    expect(t.remainingTP).toBe(0);
  });

  it('остаток совпадает с последней точкой burndown при том же окне', () => {
    const yt = issue({
      storyPoints: 5,
      testPoints: 2,
      rawChangelog: [
        {
          updatedAt: '2025-06-10T12:00:00.000Z',
          fields: [
            {
              field: { id: 'status' },
              from: { key: 'inprogress' },
              to: { key: 'closed' },
            },
          ],
        },
      ],
    });

    const totals = computeSprintTimelineTotals([yt], windowOpts);
    const burndown = computeBurndownFromChangelog({
      ytrackerIssues: [yt],
      sprintName: 'S',
      sprintIdForMatch: undefined,
      sprintStartTime,
      sprintEndTime,
      sprintStartDate: sprintStartDate,
      sprintEndDate: sprintEndDate,
      issueSummaries: new Map([['CM-1', 'Task']]),
    });
    const last = burndown.dataPoints[burndown.dataPoints.length - 1];
    expect(totals.remainingSP).toBe(last?.remainingSP);
    expect(totals.remainingTP).toBe(last?.remainingTP);
  });
});
