/**
 * Утилиты для проверок запуска спринта
 */

import type { Developer, Task, TaskPosition } from '@/types';
import type { ChecklistItem } from '@/types/tracker';

import { isTaskCompleted } from '@/features/task/utils/taskUtils';
import { validateTask, type ValidationIssue } from '@/features/task/utils/taskValidation';

import {
  computeSprintDeveloperLoads,
  computeSprintGoalChecks,
  developerLoadsMeetNorms,
  normalizeGoalIds,
  resolveSprintStartLoadNorms,
  type SprintStartLoadNorms,
} from './sprintStartChecksHelpers';

/**
 * Dev-задачи спринта с ошибками валидации (без QA и без задач на цели).
 * Один источник правды для чеклиста запуска и вкладки «Невалидные».
 * Пока набор правил фиксированный; позже критерии невалидности должны настраиваться.
 */
export function collectInvalidSprintDevTasks(
  tasks: Task[],
  goalTaskIds?: string[] | string
): Array<{ issues: ValidationIssue[]; task: Task }> {
  const goalIds = normalizeGoalIds(goalTaskIds);
  const goalIdSet = new Set(goalIds);

  const devTasksBase = tasks.filter(task => {
    if (task.team === 'QA') return false;
    if (goalIdSet.has(task.id)) return false;
    if (isTaskCompleted(task)) return false;
    return true;
  });

  return devTasksBase
    .map(task => ({
      task,
      issues: validateTask(task),
    }))
    .filter(({ issues }) => issues.length > 0);
}

interface SprintStartChecks {
  allChecksPassed: boolean;
  allGoalsSmart: boolean;
  check1Passed: boolean;
  check2Passed: boolean;
  check3Passed: boolean;
  developerLoads: Array<{
    dev: Developer;
    isDeveloper: boolean;
    isQA: boolean;
    totalSP: number;
    totalTP: number;
  }>;
  hasGoals: boolean;
  invalidTasks: Array<{ issues: ValidationIssue[], task: Task; }>;
  loadNorms: SprintStartLoadNorms;
}

/**
 * Вычисляет проверки для запуска спринта
 * @param requireSmartGoals - если true, проверяет что цели SMART, иначе только наличие целей
 * @param taskPositions — позиции в свимлейне; если переданы, нагрузка SP/TP считается как в заголовке строки свимлейна (useSwimlaneLayout)
 * @param workingDaysCount — рабочих дней спринта; нормы SP/TP масштабируются (20 SP / 24 TP на WORKING_DAYS)
 */
export function calculateSprintStartChecks(
  checklistItems: ChecklistItem[],
  tasks: Task[],
  developers: Developer[],
  qaTasksMap: Map<string, Task>,
  goalTaskIds?: string[] | string,
  _selectedSprintId?: number | null,
  requireSmartGoals: boolean = true,
  taskPositions?: Map<string, TaskPosition> | null,
  workingDaysCount?: number
): SprintStartChecks {
  const loadNorms = resolveSprintStartLoadNorms(workingDaysCount);
  const invalidTasks = collectInvalidSprintDevTasks(tasks, goalTaskIds);
  const { hasGoals, allGoalsSmart, check1Passed } = computeSprintGoalChecks(
    checklistItems,
    requireSmartGoals
  );

  const developerLoads = computeSprintDeveloperLoads(
    tasks,
    developers,
    qaTasksMap,
    goalTaskIds,
    taskPositions
  );
  const developerLoadsForNormChecklist = developerLoads.filter((load) => load.dev.role !== 'other');
  const check2Passed = developerLoadsMeetNorms(developerLoadsForNormChecklist, loadNorms);
  const check3Passed = invalidTasks.length === 0;
  const allChecksPassed = check1Passed && check2Passed && check3Passed;

  return {
    check1Passed,
    check2Passed,
    check3Passed,
    allChecksPassed,
    hasGoals,
    allGoalsSmart,
    developerLoads: developerLoadsForNormChecklist,
    invalidTasks,
    loadNorms,
  };
}
