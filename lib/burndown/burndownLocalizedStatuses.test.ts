import type { YtrackerBurndownIssue } from '@/lib/ytrackerRawIssues';

import { describe, expect, it } from 'vitest';

import { sprintTaskCompletionRulesFromStatuses } from '@/lib/sprints/sprintTaskCompletion';

import {
  computeBurndownFromChangelog,
  computeSprintTimelineTotals,
  toBurndownDateKey,
} from './computeBurndownFromChangelog';

const sprintStartDate = new Date('2025-06-02T08:00:00.000Z');
const sprintEndDate = new Date('2025-06-15T18:00:00.000Z');
const sprintStartTime = sprintStartDate.getTime();
const sprintEndTime = sprintEndDate.getTime();

describe('burndown with localized Jira status names', () => {
  it('matches Jira transitions by status id when changelog and catalog names differ in language', () => {
    // Справочник отдаёт названия на языке токена, а changelog — на языке сайта.
    const russianCatalog = sprintTaskCompletionRulesFromStatuses('jira-cloud', [
      { id: '10001', key: 'вработе', statusType: { key: 'indeterminate' } },
      { id: '10002', key: 'наревью', statusType: { key: 'indeterminate' } },
      { id: '10003', key: 'готово', statusType: { key: 'done' } },
    ]);
    const yt: YtrackerBurndownIssue = {
      inCurrentSprint: true,
      issueKey: 'CM-1',
      statusKey: 'готово',
      storyPoints: 5,
      testPoints: 0,
      rawChangelog: [
        {
          updatedAt: '2025-06-10T12:00:00.000Z',
          fields: [
            {
              field: { id: 'status' },
              from: { display: 'In Review', id: '10002', key: 'inreview' },
              to: { display: 'Done', id: '10003', key: 'done' },
            },
          ],
        },
      ],
    };

    const result = computeBurndownFromChangelog({
      completionRules: russianCatalog,
      ytrackerIssues: [yt],
      sprintName: 'S',
      sprintIdForMatch: undefined,
      sprintStartTime,
      sprintEndTime,
      sprintStartDate,
      sprintEndDate,
      issueSummaries: new Map([['CM-1', 'Task one']]),
    });

    expect(result.initialSP).toBe(5);
    const closeDayKey = toBurndownDateKey(new Date('2025-06-10T12:00:00.000Z'));
    expect(result.dataPoints.find((p) => p.dateKey === closeDayKey)?.remainingSP).toBe(0);
    expect(result.currentSP).toBe(0);

    const totals = computeSprintTimelineTotals([yt], {
      completionRules: russianCatalog,
      sprintName: 'S',
      sprintStartTime,
      windowEndMs: sprintEndTime,
      windowStartMs: sprintStartTime,
    });
    expect(totals.doneSP).toBe(5);
    expect(totals.remainingSP).toBe(0);
  });
});
