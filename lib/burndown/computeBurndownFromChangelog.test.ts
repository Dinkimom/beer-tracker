import type { YtrackerBurndownIssue } from '@/lib/ytrackerRawIssues';

import { describe, expect, it } from 'vitest';

import { sprintTaskCompletionRulesFromIntegration } from '@/lib/sprints/sprintTaskCompletion';

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
    expect(s.spDone).toBe(false);
    expect(s.tpDone).toBe(false);
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

  it('не удваивает SP, если текущая оценка уже равна Jira to-значению внутри спринта', () => {
    const yt = issue({
      storyPoints: 1,
      testPoints: 0,
      rawChangelog: [
        {
          updatedAt: '2025-06-10T10:00:00.000Z',
          fields: [
            {
              field: { id: 'storyPoints' },
              from: null,
              to: { display: '1', id: '1', key: '1' },
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

    expect(result.initialSP).toBe(0);
    const changeAt = new Date('2025-06-10T10:00:00.000Z');
    const dayKey = toBurndownDateKey(changeAt);
    const previous = new Date(changeAt);
    previous.setDate(previous.getDate() - 1);
    const dayBefore = result.dataPoints.find((point) => point.dateKey === toBurndownDateKey(previous));
    expect(dayBefore?.remainingSP).toBe(0);
    expect(result.dataPoints.find((point) => point.dateKey === dayKey)?.remainingSP).toBe(1);
    const change = (result.dailyChangelog[dayKey] ?? []).find((item) => item.type === 'story_points_change');
    expect(change?.change).toBe(1);
    expect(change?.pointsTo).toBe(1);
    expect(result.currentSP).toBe(1);
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

describe('computeBurndownFromChangelog with organization completion rules', () => {
  const sprintStartDate = new Date('2025-06-02T08:00:00.000Z');
  const sprintEndDate = new Date('2025-06-15T18:00:00.000Z');
  const sprintStartTime = sprintStartDate.getTime();
  const sprintEndTime = sprintEndDate.getTime();

  function statusMove(updatedAt: string, from: string, to: string) {
    return {
      updatedAt,
      fields: [{ field: { id: 'status' }, from: { key: from }, to: { key: to } }],
    };
  }

  function run(
    yt: YtrackerBurndownIssue,
    completionRules?: ReturnType<typeof sprintTaskCompletionRulesFromIntegration>
  ) {
    return computeBurndownFromChangelog({
      completionRules,
      ytrackerIssues: [yt],
      sprintName: 'S',
      sprintIdForMatch: undefined,
      sprintStartTime,
      sprintEndTime,
      sprintStartDate,
      sprintEndDate,
      issueSummaries: new Map(),
    });
  }

  const dayKey = toBurndownDateKey(new Date('2025-06-10T12:00:00.000Z'));

  it('burns only TP on the ready-for-release status (rc), SP stays until done', () => {
    const yt = issue({
      storyPoints: 5,
      testPoints: 2,
      rawChangelog: [statusMove('2025-06-10T12:00:00.000Z', 'inprogress', 'rc')],
    });
    const result = run(yt, sprintTaskCompletionRulesFromIntegration({ readyStatusKey: 'rc' }));
    const point = result.dataPoints.find((p) => p.dateKey === dayKey);
    expect(point?.remainingSP).toBe(5);
    expect(point?.remainingTP).toBe(0);
    const statusItem = result.dailyChangelog[dayKey]?.find((i) => i.type === 'status_change');
    expect(statusItem?.closesSP).toBe(false);
    expect(statusItem?.closesTP).toBe(true);
  });

  it('then burns SP when the task reaches a done-category status', () => {
    const yt = issue({
      storyPoints: 5,
      testPoints: 2,
      rawChangelog: [
        statusMove('2025-06-10T12:00:00.000Z', 'inprogress', 'rc'),
        statusMove('2025-06-11T12:00:00.000Z', 'rc', 'closed'),
      ],
    });
    const result = run(yt, sprintTaskCompletionRulesFromIntegration({ readyStatusKey: 'rc' }));
    const nextKey = toBurndownDateKey(new Date('2025-06-11T12:00:00.000Z'));
    const point = result.dataPoints.find((p) => p.dateKey === nextKey);
    expect(point?.remainingSP).toBe(0);
    expect(point?.remainingTP).toBe(0);
  });

  it('burns a custom status mapped to done by the integration override', () => {
    const yt = issue({
      storyPoints: 3,
      testPoints: 1,
      rawChangelog: [statusMove('2025-06-10T12:00:00.000Z', 'inprogress', 'shipped')],
    });
    const rules = sprintTaskCompletionRulesFromIntegration({
      statuses: { overridesByStatusKey: { shipped: { category: 'done' } } },
    });
    expect(run(yt).dataPoints.find((p) => p.dateKey === dayKey)?.remainingSP).toBe(3);
    const point = run(yt, rules).dataPoints.find((p) => p.dateKey === dayKey);
    expect(point?.remainingSP).toBe(0);
    expect(point?.remainingTP).toBe(0);
  });

  it('keeps sprint timeline totals on the same split rules', () => {
    const yt = issue({
      storyPoints: 5,
      testPoints: 2,
      rawChangelog: [statusMove('2025-06-10T12:00:00.000Z', 'inprogress', 'rc')],
    });
    const totals = computeSprintTimelineTotals([yt], {
      completionRules: sprintTaskCompletionRulesFromIntegration({ readyStatusKey: 'rc' }),
      sprintName: 'S',
      sprintStartTime,
      windowEndMs: sprintEndTime,
      windowStartMs: sprintStartTime,
    });
    expect(totals.doneSP).toBe(0);
    expect(totals.doneTP).toBe(2);
    expect(totals.remainingSP).toBe(5);
  });
});
