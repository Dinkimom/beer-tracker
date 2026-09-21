import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { Task } from '@/types';

import { getTaskStoryPoints, getTaskTestPoints } from '@/lib/pointsUtils';
import { isSpCompleted, isTpCompleted } from '@/lib/sprints/sprintTaskCompletion';

function roundTaskPoints(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function accumulateTaskScoreTotals(
  task: Task,
  totals: {
    spDone: number;
    spLeft: number;
    tpDone: number;
    tpTotal: number;
  },
  rules?: SprintTaskCompletionRules | null
): void {
  const sp = roundTaskPoints(getTaskStoryPoints(task));
  const tp = roundTaskPoints(getTaskTestPoints(task));

  totals.tpTotal += tp;
  if (isTpCompleted(task, rules)) {
    totals.tpDone += tp;
  }

  if (isSpCompleted(task, rules)) {
    totals.spDone += sp;
  } else {
    totals.spLeft += sp;
  }
}

export function aggregateSprintScoreFromTasks(
  tasks: Task[],
  rules?: SprintTaskCompletionRules | null
): {
  qa_done: number;
  qa_left: number;
  sp_done: number;
  sp_left: number;
} {
  const totals = { spDone: 0, spLeft: 0, tpDone: 0, tpTotal: 0 };
  for (const task of tasks) {
    accumulateTaskScoreTotals(task, totals, rules);
  }
  return {
    qa_done: totals.tpDone,
    qa_left: Math.max(0, totals.tpTotal - totals.tpDone),
    sp_done: totals.spDone,
    sp_left: totals.spLeft,
  };
}

export interface SprintScoreRow {
  goals_done: number;
  goals_percent: number;
  goals_total: number;
  mark: number;
  mark_emoji: string;
  mark_goals: number;
  mark_sp: number;
  mark_tp: number;
  qa_done: number;
  qa_left: number;
  qa_total: number;
  sname: string;
  sp_done: number;
  sp_done_percent: number;
  sp_drop: number;
  sp_left: number;
  sp_total: number;
  sprint_id: number;
  team: string;
  tp_done_percent: number;
  tp_drop: number;
}

export interface SprintScoreResponse {
  rows: SprintScoreRow[];
  testingFlowMode: 'embedded_in_dev' | 'standalone_qa_tasks' | 'unknown';
}

export const SPRINT_SCORE_MAX_MARK = 5;

function n(v: number | null | undefined): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function scoreAtLeast(value: number, thresholds: Array<{ min: number; score: number }>): number {
  for (const { min, score } of thresholds) {
    if (value >= min) {
      return score;
    }
  }
  return 0;
}

/** SP drop → до 2 баллов (меньше остатка — выше оценка). */
function scoreSpDropPercent(dropPercent: number): number {
  if (dropPercent > 30) {
    return 0;
  }
  if (dropPercent > 20) {
    return 1;
  }
  return 2;
}

/** TP drop → до 1 балла (в сумме цели+SP+TP = 5). */
function scoreTpDropPercent(dropPercent: number): number {
  if (dropPercent > 25) {
    return 0;
  }
  return 1;
}

function markEmojiForScore(mark: number): string {
  if (mark > 3) {
    return '🟢';
  }
  if (mark > 1) {
    return '🟡';
  }
  return '🔴';
}

function buildSprintScoreRow(
  sprintId: number,
  sname: string,
  team: string,
  goalsTotal: number,
  goalsDone: number,
  spLeft: number,
  spDone: number,
  qaLeft: number,
  qaDone: number
): SprintScoreRow {
  const spTotal = spLeft + spDone;
  const qaTotal = qaLeft + qaDone;
  const goalsPercent = goalsTotal > 0 ? Math.round((100 * goalsDone) / goalsTotal) : 0;
  const spDrop = spTotal > 0 ? Math.round((100 * spLeft) / spTotal) : 0;
  const tpDrop = qaTotal > 0 ? Math.round((100 * qaLeft) / qaTotal) : 0;
  const spDonePercent = spTotal > 0 ? Math.round((100 * spDone) / spTotal) : 0;
  const tpDonePercent = qaTotal > 0 ? Math.round((100 * qaDone) / qaTotal) : 0;

  const markGoals = scoreAtLeast(goalsPercent, [
    { min: 60, score: 2 },
    { min: 30, score: 1 },
  ]);
  const markSp = scoreSpDropPercent(spDrop);
  const markTp = scoreTpDropPercent(tpDrop);
  const mark = Math.min(SPRINT_SCORE_MAX_MARK, markGoals + markSp + markTp);
  const markEmoji = markEmojiForScore(mark);

  return {
    goals_done: goalsDone,
    goals_percent: goalsPercent,
    goals_total: goalsTotal,
    mark,
    mark_emoji: markEmoji,
    mark_goals: markGoals,
    mark_sp: markSp,
    mark_tp: markTp,
    qa_done: qaDone,
    qa_left: qaLeft,
    qa_total: qaTotal,
    sname,
    sp_done: spDone,
    sp_done_percent: spDonePercent,
    sp_drop: spDrop,
    sp_left: spLeft,
    sp_total: spTotal,
    sprint_id: sprintId,
    team,
    tp_done_percent: tpDonePercent,
    tp_drop: tpDrop,
  };
}

export function buildSprintScoreRows(input: {
  goalsByTeam: Array<{ goals_done: number; goals_total: number; team: string }>;
  qaDone: number;
  qaLeft: number;
  sname: string;
  spDone: number;
  spLeft: number;
  sprintId: number;
}): SprintScoreRow[] {
  if (input.goalsByTeam.length === 0) {
    return [
      buildSprintScoreRow(
        input.sprintId,
        input.sname,
        '',
        0,
        0,
        input.spLeft,
        input.spDone,
        input.qaLeft,
        input.qaDone
      ),
    ];
  }

  return input.goalsByTeam.map((g) =>
    buildSprintScoreRow(
      input.sprintId,
      input.sname,
      g.team ?? '',
      n(g.goals_total),
      n(g.goals_done),
      input.spLeft,
      input.spDone,
      input.qaLeft,
      input.qaDone
    )
  );
}
