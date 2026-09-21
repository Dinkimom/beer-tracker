/**
 * Утилиты для вычисления метрик спринта
 */

import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { Developer, Task } from '@/types';

import { TASK_GROUP_KEY_UNASSIGNED } from '@/features/task/constants/taskGroupKeys';
import { getTaskStoryPoints, getTaskTestPoints, isOriginalTask } from '@/lib/pointsUtils';

import {
  burndownCompletionPercent,
  collectAssigneePersonIds,
  computeBurndownScopeFromTasks,
  goalTaskIdSet,
} from './sprintMetricsHelpers';
import { isDone, isTpClosedStatus } from './sprintMetricsStatusHelpers';

/** Экспорт для использования в свимлейнах и др. */
export function isTaskDone(
  task: Task,
  rules?: SprintTaskCompletionRules | null
): boolean {
  return isDone(task, rules);
}

/**
 * Разбивка по реальным статусам (ключ из Tracker + суммы SP/TP).
 * Выводятся только статусы, у которых есть объём (totalSP > 0 или totalTP > 0).
 */
interface MetricsByStatusRow {
  statusKey: string;
  totalSP: number;
  totalTP: number;
}

/**
 * Разбивка по исполнителям: для разработчиков — SP (сделано/всего/%), для QA — TP (сделано/всего/%).
 * Человек может быть исполнителем (считаем SP) и/или QA-инженером (считаем TP).
 */
interface MetricsByAssigneeRow {
  completedSP: number;
  completedTP: number;
  percentSP: number;
  percentTP: number;
  personId: string;
  personName: string;
  totalSP: number;
  totalTP: number;
}

/** Порядок статусов для разбивки: от бэклога к закрытию. Ключи в lowerCase. */
const STATUS_ORDER: string[] = [
  'backlog',
  'readyfordevelopment',
  'transferredtodevelopment',
  'inprogress',
  'review',
  'inreview',
  'readyfortest',
  'readyfortesting',
  'intesting',
  'rc',
  'closed',
  'defect',
  'blocked',
  '__none__',
];

function statusSortIndex(statusKey: string): number {
  const normalized = statusKey.toLowerCase();
  const idx = STATUS_ORDER.indexOf(normalized);
  return idx === -1 ? STATUS_ORDER.length : idx;
}

function qaPersonDisplayNameFromTasks(id: string, qaForPerson: Task[]): string | undefined {
  const first = qaForPerson[0];
  if (!first) return undefined;
  const assigneeMatches = (first.assignee ?? '__unassigned__') === id;
  return assigneeMatches ? first.assigneeName : first.qaEngineerName;
}

function resolveMetricsPersonName(
  id: string,
  pid: string,
  developerMap: Map<string, Developer>,
  devAsAssignee: Task[],
  devAsQa: Task[],
  qaForPerson: Task[]
): string {
  if (id === '__unassigned__') return TASK_GROUP_KEY_UNASSIGNED;
  const qaPersonName = qaPersonDisplayNameFromTasks(id, qaForPerson);
  return (
    developerMap.get(pid)?.name
    ?? devAsAssignee[0]?.assigneeName
    ?? devAsQa[0]?.qaEngineerName
    ?? qaPersonName
    ?? pid
  );
}

function buildMetricsByAssigneeRowForPerson(
  pid: string,
  devTasks: Task[],
  qaTasks: Task[],
  developerMap: Map<string, Developer>,
  rules?: SprintTaskCompletionRules | null
): MetricsByAssigneeRow | null {
  const id = pid === '' ? '__unassigned__' : pid;

  const devAsAssignee = devTasks.filter(t => (t.assignee ?? '__unassigned__') === id);
  const totalSP = devAsAssignee.reduce((s, t) => s + getTaskStoryPoints(t), 0);
  const completedSP = devAsAssignee
    .filter((t) => isDone(t, rules))
    .reduce((s, t) => s + getTaskStoryPoints(t), 0);
  const percentSP = totalSP > 0 ? Math.round((completedSP / totalSP) * 100) : 0;

  const devAsQa = devTasks.filter(t => (t.qaEngineer ?? '') === pid);
  const qaForPerson = qaTasks.filter(
    t => (t.assignee ?? '__unassigned__') === id || (t.qaEngineer ?? '') === pid
  );
  const tpTasks = [...devAsQa, ...qaForPerson];
  const totalTP = tpTasks.reduce((s, t) => s + getTaskTestPoints(t), 0);
  const completedTP = tpTasks
    .filter((t) => isTpClosedStatus(t, rules))
    .reduce((s, t) => s + getTaskTestPoints(t), 0);
  const percentTP = totalTP > 0 ? Math.round((completedTP / totalTP) * 100) : 0;

  if (totalSP === 0 && totalTP === 0) return null;

  const personName = resolveMetricsPersonName(id, pid, developerMap, devAsAssignee, devAsQa, qaForPerson);

  return {
    completedSP,
    completedTP,
    percentSP,
    percentTP,
    personId: id,
    personName,
    totalSP,
    totalTP,
  };
}

/**
 * Разбивка по реальным статусам задач (originalStatus).
 * Группируем по текущему статусу, считаем сумму SP и TP. Возвращаем только статусы с объёмом.
 * Сортировка: по порядку стадий (бэклог → готово к разработке → в работе → … → закрыто).
 */
export function calculateMetricsByStatus(
  tasks: Task[],
  goalTaskIds?: string[] | string
): MetricsByStatusRow[] {
  const goalIdSet = goalTaskIdSet(goalTaskIds);
  const devTasks = tasks.filter(task => isOriginalTask(task) && !goalIdSet.has(task.id));

  const byStatus = new Map<string, { totalSP: number; totalTP: number }>();
  for (const task of devTasks) {
    const key = (task.originalStatus ?? '').trim() || '__none__';
    const cur = byStatus.get(key) ?? { totalSP: 0, totalTP: 0 };
    cur.totalSP += getTaskStoryPoints(task);
    cur.totalTP += getTaskTestPoints(task);
    byStatus.set(key, cur);
  }

  const rows: MetricsByStatusRow[] = [];
  for (const [statusKey, { totalSP, totalTP }] of byStatus) {
    if (totalSP > 0 || totalTP > 0) {
      rows.push({ statusKey, totalSP, totalTP });
    }
  }
  rows.sort((a, b) => statusSortIndex(a.statusKey) - statusSortIndex(b.statusKey));
  return rows;
}

/**
 * Разбивка по исполнителям: разработчики — только SP, QA — только TP (исполнитель или qaEngineer в задаче).
 * Считаем сделано | всего | процент по каждому.
 */
export function calculateMetricsByAssignee(
  tasks: Task[],
  goalTaskIds: string[] | string | undefined,
  developerMap: Map<string, Developer>,
  rules?: SprintTaskCompletionRules | null
): MetricsByAssigneeRow[] {
  const goalIdSet = goalTaskIdSet(goalTaskIds);
  const devTasks = tasks.filter(t => isOriginalTask(t) && !goalIdSet.has(t.id));
  const qaTasks = tasks.filter(t => t.team === 'QA' && !goalIdSet.has(t.id));

  const personIds = collectAssigneePersonIds(devTasks, qaTasks);

  const rows: MetricsByAssigneeRow[] = [];
  for (const pid of personIds) {
    const row = buildMetricsByAssigneeRowForPerson(pid, devTasks, qaTasks, developerMap, rules);
    if (row) rows.push(row);
  }
  rows.sort((a, b) => (b.totalSP + b.totalTP) - (a.totalSP + a.totalTP));
  return rows;
}

/** Итоги SP/TP для плиток на вкладке burndown (совпадают с суммой по {@link calculateMetricsByStatus}). */
export interface BurndownTilesFromTasks {
  completedSP: number;
  completedTP: number;
  completionPercentSP: number;
  completionPercentTP: number;
  totalScopeSP: number;
  totalScopeTP: number;
}

/**
 * Плитки «сделано / всего / %» на бёрндауне — тот же набор задач, что разбивка по статусам в сайдбаре:
 * только {@link isOriginalTask}, без целей спринта; «сделано» по {@link isTaskDone}.
 * Линия графика по-прежнему строится из changelog на бэкенде.
 */
export function computeBurndownTilesFromTasks(
  tasks: Task[],
  goalTaskIds?: string[] | string,
  rules?: SprintTaskCompletionRules | null
): BurndownTilesFromTasks {
  const goalIdSet = goalTaskIdSet(goalTaskIds);
  const scope = computeBurndownScopeFromTasks(tasks, goalIdSet, rules);

  return {
    completedSP: scope.completedSP,
    completedTP: scope.completedTP,
    completionPercentSP: burndownCompletionPercent(scope.completedSP, scope.totalScopeSP),
    completionPercentTP: burndownCompletionPercent(scope.completedTP, scope.totalScopeTP),
    totalScopeSP: scope.totalScopeSP,
    totalScopeTP: scope.totalScopeTP,
  };
}
