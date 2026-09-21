import type { Developer, Task, TaskPosition } from '@/types';
import type { ChecklistItem } from '@/types/tracker';

import { WORKING_DAYS, WORKING_DAYS_PER_WEEK } from '@/constants';
import { computeAssigneePointsStats } from '@/features/sprint/utils/assigneePointsStats';
import { getTaskStoryPoints, getTaskTestPoints } from '@/lib/pointsUtils';

import { isSmartGoal } from './goalUtils';

/** Норма SP разработчика на стандартный спринт (WORKING_DAYS рабочих дней). 2 SP в сутки. */
const SPRINT_START_DEV_SP_NORM_FULL = 20;
/** Норма TP тестировщика на одну рабочую неделю (WORKING_DAYS_PER_WEEK). На полный спринт 10 дней = 24 TP. */
const SPRINT_START_TESTER_TP_PER_WEEK = 12;

export interface SprintStartLoadNorms {
  requiredSP: number;
  requiredTP: number;
  workingDaysCount: number;
}

/**
 * Пересчёт договорных объёмов под длительность спринта.
 * База: 20 SP на WORKING_DAYS (2 SP/день); 12 TP на рабочую неделю.
 * При 5 днях — 10 SP / 12 TP; при 10 — 20 SP / 24 TP.
 */
export function resolveSprintStartLoadNorms(
  workingDaysCount: number = WORKING_DAYS
): SprintStartLoadNorms {
  const days = workingDaysCount > 0 ? workingDaysCount : WORKING_DAYS;
  return {
    workingDaysCount: days,
    requiredSP: (SPRINT_START_DEV_SP_NORM_FULL * days) / WORKING_DAYS,
    requiredTP: (SPRINT_START_TESTER_TP_PER_WEEK * days) / WORKING_DAYS_PER_WEEK,
  };
}

function normalizeGoalIds(goalTaskIds?: string[] | string): string[] {
  if (goalTaskIds == null) return [];
  if (Array.isArray(goalTaskIds)) return goalTaskIds;
  return [goalTaskIds];
}

function pointsMeetNorm(actual: number, required: number): boolean {
  return Math.abs(actual - required) < 1e-6;
}

export function developerLoadMeetsSprintStartNorm(
  load: {
    dev: Pick<Developer, 'role'>;
    totalSP: number;
    totalTP: number;
  },
  norms: SprintStartLoadNorms
): boolean {
  if (load.dev.role === 'tester') return pointsMeetNorm(load.totalTP, norms.requiredTP);
  return pointsMeetNorm(load.totalSP, norms.requiredSP);
}

function buildTasksMap(tasks: Task[], qaTasksArray: Task[]): Map<string, Task> {
  const tasksMap = new Map<string, Task>();
  for (const t of tasks) tasksMap.set(t.id, t);
  for (const t of qaTasksArray) tasksMap.set(t.id, t);
  return tasksMap;
}

function computeDeveloperLoadTotals(
  dev: Developer,
  devTasksOnly: Task[],
  qaTasksArray: Task[],
  plannedByAssignee: Map<string, { storyPoints: number; testPoints: number }> | null
): { isDeveloper: boolean; isQA: boolean; totalSP: number; totalTP: number } {
  const devTasks = devTasksOnly.filter((task) => task.assignee === dev.id);
  const qaTasks = qaTasksArray.filter((task) => task.qaEngineer === dev.id);
  const isDeveloper = devTasks.length > 0;
  const isQA = qaTasks.length > 0;

  if (plannedByAssignee) {
    const p = plannedByAssignee.get(dev.id) ?? { storyPoints: 0, testPoints: 0 };
    return { totalSP: p.storyPoints, totalTP: p.testPoints, isDeveloper, isQA };
  }

  return {
    totalSP: devTasks.reduce((sum, task) => sum + getTaskStoryPoints(task), 0),
    totalTP: qaTasks.reduce((sum, task) => sum + getTaskTestPoints(task), 0),
    isDeveloper,
    isQA,
  };
}

export function computeSprintGoalChecks(
  checklistItems: ChecklistItem[],
  requireSmartGoals: boolean
): { allGoalsSmart: boolean; check1Passed: boolean; hasGoals: boolean } {
  const hasGoals = checklistItems.length > 0;
  const allGoalsSmart = checklistItems.every((item) => isSmartGoal(item.text));
  const check1Passed = hasGoals && (requireSmartGoals ? allGoalsSmart : true);
  return { hasGoals, allGoalsSmart, check1Passed };
}

export function computeSprintDeveloperLoads(
  tasks: Task[],
  developers: Developer[],
  qaTasksMap: Map<string, Task>,
  goalTaskIds: string[] | string | undefined,
  taskPositions?: Map<string, TaskPosition> | null
) {
  const goalIds = normalizeGoalIds(goalTaskIds);
  const goalIdSet = new Set(goalIds);
  const devTasksOnly = tasks.filter((task) => task.team !== 'QA' && !goalIdSet.has(task.id));
  const qaTasksArray = Array.from(qaTasksMap.values());
  const tasksMap = buildTasksMap(tasks, qaTasksArray);
  const plannedByAssignee =
    taskPositions != null ? computeAssigneePointsStats(taskPositions, tasksMap).byAssignee : null;

  return developers.map((dev) => ({
    dev,
    ...computeDeveloperLoadTotals(dev, devTasksOnly, qaTasksArray, plannedByAssignee),
  }));
}

export function developerLoadsMeetNorms(
  developerLoads: Array<{ dev: Developer; totalSP: number; totalTP: number }>,
  norms: SprintStartLoadNorms = resolveSprintStartLoadNorms()
): boolean {
  const forNormChecklist = developerLoads.filter((load) => load.dev.role !== 'other');
  return (
    forNormChecklist.length === 0 ||
    forNormChecklist.every((load) => developerLoadMeetsSprintStartNorm(load, norms))
  );
}

export { normalizeGoalIds };
