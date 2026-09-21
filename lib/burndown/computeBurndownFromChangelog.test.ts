import type { YtrackerBurndownIssue } from '@/lib/ytrackerRawIssues';

import { describe, expect, it } from 'vitest';

import {
  buildTaskStateAtSprintStart,
  collectBurndownEventsInSprintWindow,
  computeBurndownFromChangelog,
  computeSprintTimelineTotals,
  sprintArrayContainsSprint,
  toBurndownDateKey,
} from './computeBurndownFromChangelog';

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

describe('sprintArrayContainsSprint', () => {
  it('matches by display name', () => {
    expect(sprintArrayContainsSprint([{ display: 'Sprint 42', id: '1' }], 'Sprint 42', undefined)).toBe(true);
  });

  it('matches by id when provided', () => {
    expect(sprintArrayContainsSprint([{ display: 'Other', id: '99' }], 'x', '99')).toBe(true);
  });
});

describe('buildTaskStateAtSprintStart', () => {
  const sprintStart = new Date('2025-06-02T08:00:00.000Z').getTime();

  it('defaults inSprint to true when changelog has no sprint field', () => {
    const yt = issue({
      rawChangelog: [
        {
          updatedAt: '2025-05-01T10:00:00.000Z',
          fields: [
            {
              field: { id: 'storyPoints' },
              from: 0,
              to: 5,
            },
          ],
        },
      ],
    });
    const s = buildTaskStateAtSprintStart(yt, 'My Sprint', '1', sprintStart);
    expect(s.inSprint).toBe(true);
    expect(s.sp).toBe(5);
    expect(s.isDone).toBe(false);
  });

  it('respects sprint removal before sprint start', () => {
    const yt = issue({
      rawChangelog: [
        {
          updatedAt: '2025-05-10T10:00:00.000Z',
          fields: [
            {
              field: { id: 'sprint' },
              from: [{ display: 'My Sprint', id: '1' }],
              to: [],
            },
          ],
        },
      ],
    });
    const s = buildTaskStateAtSprintStart(yt, 'My Sprint', '1', sprintStart);
    expect(s.inSprint).toBe(false);
  });
});

describe('computeBurndownFromChangelog', () => {
  const sprintStartDate = new Date('2025-06-02T08:00:00.000Z');
  const sprintEndDate = new Date('2025-06-15T18:00:00.000Z');
  const sprintStartTime = sprintStartDate.getTime();
  const sprintEndTime = sprintEndDate.getTime();

  it('burns down SP when task is closed in sprint window', () => {
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

    const summaries = new Map([['CM-1', 'Task one']]);
    const result = computeBurndownFromChangelog({
      ytrackerIssues: [yt],
      sprintName: 'S',
      sprintIdForMatch: undefined,
      sprintStartTime,
      sprintEndTime,
      sprintStartDate,
      sprintEndDate,
      issueSummaries: summaries,
    });

    expect(result.initialSP).toBe(5);
    expect(result.initialTP).toBe(2);

    const closeDayKey = toBurndownDateKey(new Date('2025-06-10T12:00:00.000Z'));
    const closeDay = result.dataPoints.find((p) => p.dateKey === closeDayKey);
    expect(closeDay?.remainingSP).toBe(0);
    expect(closeDay?.remainingTP).toBe(0);

    const before = new Date('2025-06-10T12:00:00.000Z');
    before.setDate(before.getDate() - 1);
    const beforeKey = toBurndownDateKey(before);
    const dayBefore = result.dataPoints.find((p) => p.dateKey === beforeKey);
    expect(dayBefore?.remainingSP).toBe(5);

    const closedItems = Object.values(result.dailyChangelog)
      .flat()
      .filter((i) => i.type === 'status_change' && i.statusToKey === 'closed');
    expect(closedItems).toHaveLength(1);
    expect(closedItems[0]?.change).toBe(-5);
    expect(closedItems[0]?.changeTP).toBe(-2);

    expect(result.currentSP).toBe(0);
    expect(result.currentTP).toBe(0);
  });

  it('закрытие с 0 SP/TP попадает в dailyChangelog (раньше отбрасывалось из‑за нулевой дельты)', () => {
    const yt = issue({
      storyPoints: 0,
      testPoints: 0,
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
    const result = computeBurndownFromChangelog({
      ytrackerIssues: [yt],
      sprintName: 'S',
      sprintIdForMatch: undefined,
      sprintStartTime,
      sprintEndTime,
      sprintStartDate,
      sprintEndDate,
      issueSummaries: new Map([['CM-1', 'Zero']]),
    });
    const closeDayKey = toBurndownDateKey(new Date('2025-06-10T12:00:00.000Z'));
    const toClosed = (result.dailyChangelog[closeDayKey] ?? []).filter(
      (i) => i.type === 'status_change' && i.statusToKey === 'closed'
    );
    expect(toClosed).toHaveLength(1);
    expect(toClosed[0]?.change).toBe(0);
    expect(toClosed[0]?.changeTP).toBe(0);
  });

  it('добавление в спринт, переоценка и снятие за день: остаток 0, задача не в итоговом объёме спринта', () => {
    const yt = issue({
      storyPoints: 5,
      testPoints: 0,
      rawChangelog: [
        {
          updatedAt: '2025-05-10T10:00:00.000Z',
          fields: [
            {
              field: { id: 'sprint' },
              from: [{ display: 'S', id: '1' }],
              to: [],
            },
          ],
        },
        {
          updatedAt: '2025-06-10T10:00:00.000Z',
          fields: [
            {
              field: { id: 'sprint' },
              from: [],
              to: [{ display: 'S', id: '1' }],
            },
          ],
        },
        {
          updatedAt: '2025-06-10T10:00:01.000Z',
          fields: [{ field: { id: 'storyPoints' }, from: 5, to: 8 }],
        },
        {
          updatedAt: '2025-06-10T10:00:02.000Z',
          fields: [
            {
              field: { id: 'sprint' },
              from: [{ display: 'S', id: '1' }],
              to: [],
            },
          ],
        },
      ],
    });

    const result = computeBurndownFromChangelog({
      ytrackerIssues: [yt],
      sprintName: 'S',
      sprintIdForMatch: '1',
      sprintStartTime,
      sprintEndTime,
      sprintStartDate,
      sprintEndDate,
      issueSummaries: new Map([['CM-1', 'Task']]),
    });

    expect(result.initialSP).toBe(0);
    expect(result.initialTP).toBe(0);

    const dayKey = toBurndownDateKey(new Date('2025-06-10T12:00:00.000Z'));
    const thatDay = result.dataPoints.find((p) => p.dateKey === dayKey);
    expect(thatDay?.remainingSP).toBe(0);
    expect(thatDay?.remainingTP).toBe(0);

    expect(result.currentSP).toBe(0);
    expect(result.currentTP).toBe(0);

    const dayItems = result.dailyChangelog[dayKey] ?? [];
    expect(dayItems.some((i) => i.type === 'added')).toBe(true);
    expect(dayItems.some((i) => i.type === 'story_points_change' && i.change === 3)).toBe(true);
    expect(dayItems.some((i) => i.type === 'removed')).toBe(true);

    const totals = computeSprintTimelineTotals([yt], {
      sprintName: 'S',
      sprintId: '1',
      sprintStartTime,
      windowStartMs: sprintStartTime,
      windowEndMs: sprintEndTime,
    });
    expect(totals.totalSP).toBe(0);
    expect(totals.totalTP).toBe(0);
    expect(totals.doneSP).toBe(0);
    expect(totals.doneTP).toBe(0);
    expect(totals.remainingSP).toBe(0);
    expect(totals.remainingTP).toBe(0);
  });

  it('дубли closed в issue_logs не вычитают SP/TP второй раз', () => {
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
        {
          updatedAt: '2025-06-10T12:05:00.000Z',
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
    const summaries = new Map([['CM-1', 'Task one']]);
    const result = computeBurndownFromChangelog({
      ytrackerIssues: [yt],
      sprintName: 'S',
      sprintIdForMatch: undefined,
      sprintStartTime,
      sprintEndTime,
      sprintStartDate,
      sprintEndDate,
      issueSummaries: summaries,
    });
    const closeDayKey = toBurndownDateKey(new Date('2025-06-10T12:00:00.000Z'));
    const closeDay = result.dataPoints.find((p) => p.dateKey === closeDayKey);
    expect(closeDay?.remainingSP).toBe(0);
    expect(closeDay?.remainingTP).toBe(0);

    const closes = Object.values(result.dailyChangelog)
      .flat()
      .filter((i) => i.type === 'status_change' && i.statusToKey === 'closed' && i.issueKey === 'CM-1');
    // Две записи changelog → две строки status_change; остаток на конец дня не «двойной»
    expect(closes.length).toBe(2);
  });
});

describe('IssueWorkflow / статус как объект', () => {
  const sprintStartDate = new Date('2025-06-02T08:00:00.000Z');
  const sprintEndDate = new Date('2025-06-15T18:00:00.000Z');
  const sprintStartTime = sprintStartDate.getTime();
  const sprintEndTime = sprintEndDate.getTime();

  it('учитывает закрытие из записи IssueWorkflow (не только IssueUpdated)', () => {
    const yt = issue({
      storyPoints: 5,
      testPoints: 2,
      rawChangelog: [
        {
          id: 'wf-1',
          type: 'IssueWorkflow',
          updatedAt: '2025-06-10T12:00:00.000Z',
          fields: [
            {
              field: { id: 'status' },
              from: { id: '10', key: 'backlog', display: 'Backlog' },
              to: { id: '8', key: 'closed', display: 'Closed' },
            },
          ],
        },
      ],
    });
    const result = computeBurndownFromChangelog({
      ytrackerIssues: [yt],
      sprintName: 'S',
      sprintIdForMatch: undefined,
      sprintStartTime,
      sprintEndTime,
      sprintStartDate,
      sprintEndDate,
      issueSummaries: new Map([['CM-1', 'Task']]),
    });
    const closeDayKey = toBurndownDateKey(new Date('2025-06-10T12:00:00.000Z'));
    expect(result.dataPoints.find((p) => p.dateKey === closeDayKey)?.remainingSP).toBe(0);
  });
});

describe('collectBurndownEventsInSprintWindow', () => {
  it('returns events ordered by time then issue key', () => {
    const a = issue({
      issueKey: 'CM-A',
      rawChangelog: [
        {
          updatedAt: '2025-06-05T10:00:00.000Z',
          fields: [{ field: { id: 'storyPoints' }, from: 1, to: 2 }],
        },
      ],
    });
    const b = issue({
      issueKey: 'CM-B',
      rawChangelog: [
        {
          updatedAt: '2025-06-05T10:00:00.000Z',
          fields: [{ field: { id: 'storyPoints' }, from: 1, to: 3 }],
        },
      ],
    });
    const evs = collectBurndownEventsInSprintWindow(
      [a, b],
      'S',
      undefined,
      new Date('2025-06-01').getTime(),
      new Date('2025-06-30').getTime()
    );
    expect(evs.map((e) => e.issueKey)).toEqual(['CM-A', 'CM-B']);
  });
});
