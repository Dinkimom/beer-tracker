import type { SprintScoreResponse } from './sprintScoreHelpers';
import type { TrackerTestingFlowMode } from './testingFlowMode';
import type { BurndownDayChangelogItem } from '@/lib/api/types';
import type { IssueTrackerBurndownIssue } from '@/lib/issueTrackerProvider/changelogTypes';
import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { Task } from '@/types';

import {
  computeBurndownFromChangelog,
  computeSprintTimelineTotals,
  type BurndownDataPoint,
  type SprintTimelineTotals,
} from '@/lib/burndown/computeBurndownFromChangelog';

import { aggregateSprintScoreFromTasks, buildSprintScoreRows } from './sprintScoreHelpers';

export function buildCreateSprintApiResponse(sprint: unknown): {
  sprint: unknown;
  success: true;
} {
  return {
    sprint,
    success: true,
  };
}

export function buildSprintScoreApiResponse(input: {
  completionRules?: SprintTaskCompletionRules | null;
  goalsByTeam: Array<{ goals_done: number; goals_total: number; team: string }>;
  snapshotTasks: Task[];
  sprintId: number;
  sprintName: string;
  testingFlowMode: TrackerTestingFlowMode;
}): SprintScoreResponse {
  const { qa_done: qaDone, qa_left: qaLeft, sp_done: spDone, sp_left: spLeft } =
    aggregateSprintScoreFromTasks(input.snapshotTasks, input.completionRules);
  const rows = buildSprintScoreRows({
    goalsByTeam: input.goalsByTeam,
    qaDone,
    qaLeft,
    sname: input.sprintName,
    spDone,
    spLeft,
    sprintId: input.sprintId,
  });
  rows.sort((left, right) => right.mark - left.mark || left.sname.localeCompare(right.sname, 'ru'));
  return {
    rows,
    testingFlowMode: input.testingFlowMode,
  };
}

export interface BurndownApiResponse {
  currentSP: number;
  currentTP: number;
  dailyChangelog: Record<string, BurndownDayChangelogItem[]>;
  dataPoints: BurndownDataPoint[];
  initialSP: number;
  initialTP: number;
  sprintInfo: {
    endDate: string;
    name: string;
    startDate: string;
  };
  sprintTimelineTotals: SprintTimelineTotals;
  testingFlowMode: TrackerTestingFlowMode;
}

export function buildEmptyBurndownDataPoints(
  startDateTime: string,
  endDateTime: string
): BurndownDataPoint[] {
  const startDate = new Date(startDateTime);
  const endDate = new Date(endDateTime);
  const emptyDataPoints: BurndownDataPoint[] = [];
  for (const day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
    const cur = new Date(day);
    emptyDataPoints.push({
      date: new Date(cur.getFullYear(), cur.getMonth(), cur.getDate()).toISOString(),
      dateKey: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`,
      remainingSP: 0,
      remainingTP: 0,
    });
  }
  return emptyDataPoints;
}

export const EMPTY_SPRINT_TIMELINE_TOTALS: SprintTimelineTotals = {
  doneSP: 0,
  doneTP: 0,
  remainingSP: 0,
  remainingTP: 0,
  totalSP: 0,
  totalTP: 0,
};

export const BURNDOWN_API_RESPONSE_KEYS = [
  'currentSP',
  'currentTP',
  'dailyChangelog',
  'dataPoints',
  'initialSP',
  'initialTP',
  'sprintInfo',
  'sprintTimelineTotals',
  'testingFlowMode',
] as const satisfies ReadonlyArray<keyof BurndownApiResponse>;

export function buildBurndownApiResponse(input: BurndownApiResponse): BurndownApiResponse {
  return {
    currentSP: input.currentSP,
    currentTP: input.currentTP,
    dailyChangelog: input.dailyChangelog,
    dataPoints: input.dataPoints,
    initialSP: input.initialSP,
    initialTP: input.initialTP,
    sprintInfo: input.sprintInfo,
    sprintTimelineTotals: { ...input.sprintTimelineTotals },
    testingFlowMode: input.testingFlowMode,
  };
}

export function buildComputedBurndownApiResponse(input: {
  issueSummaries: Map<string, string>;
  sprintEndDate: Date;
  sprintEndTime: number;
  sprintIdForMatch: string | undefined;
  sprintInfo: BurndownApiResponse['sprintInfo'];
  sprintName: string;
  sprintStartDate: Date;
  sprintStartTime: number;
  testingFlowMode: TrackerTestingFlowMode;
  ytrackerIssues: IssueTrackerBurndownIssue[];
}): BurndownApiResponse {
  const computed = computeBurndownFromChangelog({
    issueSummaries: input.issueSummaries,
    sprintEndDate: input.sprintEndDate,
    sprintEndTime: input.sprintEndTime,
    sprintIdForMatch: input.sprintIdForMatch,
    sprintName: input.sprintName,
    sprintStartDate: input.sprintStartDate,
    sprintStartTime: input.sprintStartTime,
    ytrackerIssues: input.ytrackerIssues,
  });
  const sprintTimelineTotals = computeSprintTimelineTotals(input.ytrackerIssues, {
    sprintId: input.sprintIdForMatch,
    sprintName: input.sprintName,
    sprintStartTime: input.sprintStartTime,
    windowEndMs: input.sprintEndTime,
    windowStartMs: input.sprintStartTime,
  });
  return buildBurndownApiResponse({
    currentSP: computed.currentSP,
    currentTP: computed.currentTP,
    dailyChangelog: computed.dailyChangelog,
    dataPoints: computed.dataPoints,
    initialSP: computed.initialSP,
    initialTP: computed.initialTP,
    sprintInfo: input.sprintInfo,
    sprintTimelineTotals,
    testingFlowMode: input.testingFlowMode,
  });
}
