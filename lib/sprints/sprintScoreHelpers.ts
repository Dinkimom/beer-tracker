import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { Task } from '@/types';

import { getTaskStoryPoints, getTaskTestPoints, isOriginalTask } from '@/lib/pointsUtils';
import { isSpCompleted, isTpCompleted } from '@/lib/sprints/sprintTaskCompletion';

/** Объём спринта «сделано / всего» по SP и TP. */
interface SprintCompletionScope {
  completedSP: number;
  completedTP: number;
  totalScopeSP: number;
  totalScopeTP: number;
}

type SprintScopeTask = Pick<
  Task,
  | 'hideTestPointsByIntegration'
  | 'id'
  | 'originalStatus'
  | 'originalStatusId'
  | 'status'
  | 'statusTypeKey'
  | 'storyPoints'
  | 'team'
  | 'testPoints'
>;

function finitePoints(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/**
 * Единый подсчёт объёма спринта для плиток (сайдбар, бёрндаун) и серверной оценки спринта:
 * только оригинальные задачи (без QA-фантомов), без целей спринта, дробные SP/TP без округления;
 * «сделано» — правила завершения организации (SP и TP раздельно).
 */
export function computeSprintCompletionScope(
  tasks: readonly SprintScopeTask[],
  goalIds: ReadonlySet<string>,
  rules?: SprintTaskCompletionRules | null
): SprintCompletionScope {
  const scope: SprintCompletionScope = {
    completedSP: 0,
    completedTP: 0,
    totalScopeSP: 0,
    totalScopeTP: 0,
  };
  for (const task of tasks) {
    if (!isOriginalTask(task) || goalIds.has(task.id)) continue;
    const sp = finitePoints(getTaskStoryPoints(task));
    const tp = finitePoints(getTaskTestPoints(task));
    scope.totalScopeSP += sp;
    scope.totalScopeTP += tp;
    if (isSpCompleted(task, rules)) scope.completedSP += sp;
    if (isTpCompleted(task, rules)) scope.completedTP += tp;
  }
  return scope;
}

/**
 * SP/TP для оценки спринта на сервере — тот же {@link computeSprintCompletionScope}, что у плиток
 * в планере (цели — задачи с type `goal`, как `goalTaskIds` на клиенте), чтобы оценка совпадала
 * с показанными числами.
 */
export function aggregateSprintScoreFromTasks(
  tasks: Task[],
  rules?: SprintTaskCompletionRules | null
): {
  qa_done: number;
  qa_left: number;
  sp_done: number;
  sp_left: number;
} {
  const goalIds = new Set(tasks.filter((task) => task.type === 'goal').map((task) => task.id));
  const scope = computeSprintCompletionScope(tasks, goalIds, rules);
  return {
    qa_done: scope.completedTP,
    qa_left: Math.max(0, scope.totalScopeTP - scope.completedTP),
    sp_done: scope.completedSP,
    sp_left: Math.max(0, scope.totalScopeSP - scope.completedSP),
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
