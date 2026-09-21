import type { FlattenedRow } from '@/features/sprint/components/SprintPlanner/occupancy/utils/buildFlattenedRows';
import type { Task, TaskPosition } from '@/types';

import { PARTS_PER_DAY } from '@/constants';
import { isTaskDone, type BurndownTilesFromTasks } from '@/features/sprint/utils/sprintMetrics';
import { getTaskStoryPoints, getTaskTestPoints } from '@/lib/pointsUtils';

import {
  collectHoverConnectedTaskIds,
  occupancyCompletedTestPoints,
} from './occupancyViewHelpersMetrics';

function resolveOccupancyQaHeightSignature(
  qaTask: Task | undefined,
  task: Task,
  taskPositions: Map<string, TaskPosition>
): string {
  if (qaTask && qaTask.id !== task.id) {
    return taskPositions.has(qaTask.id) ? '1' : '0';
  }
  return '-';
}

function occupancyPlanHeightSignature(
  row: { task: Task; qaTask?: Task },
  taskPositions: Map<string, TaskPosition>
): string {
  const { task, qaTask } = row;
  const dev = taskPositions.has(task.id) ? '1' : '0';
  const qa = resolveOccupancyQaHeightSignature(qaTask, task, taskPositions);
  return `${dev}:${qa}`;
}

/**
 * TP строки «Занятость»: сумма TP dev + отдельной QA в Tracker.
 * Синтетическая QA с `originalTaskId === task.id` — та же оценка, что у dev, не суммируем дважды.
 */
function occupancyRowTestPointsForTotals(task: Task, qaTask: Task | undefined): number {
  const devTp = getTaskTestPoints(task);
  if (qaTask == null) return devTp;
  const qaTp = getTaskTestPoints(qaTask);
  if (qaTask.originalTaskId === task.id) {
    return Math.max(devTp, qaTp);
  }
  return devTp + qaTp;
}

export function computeOccupancyTaskTotals(
  visibleRows: FlattenedRow[],
  _taskPositions: Map<string, TaskPosition>
): { totalStoryPoints: number; totalTestPoints: number } {
  let sp = 0;
  let tp = 0;

  for (const row of visibleRows) {
    if (row.type !== 'task') continue;

    const { task, qaTask } = row;

    sp += getTaskStoryPoints(task);

    tp += occupancyRowTestPointsForTotals(task, qaTask);
  }

  return { totalStoryPoints: sp, totalTestPoints: tp };
}

function occupancyBurndownRowDeltas(
  row: FlattenedRow,
  _taskPositions: Map<string, TaskPosition>
): { sp: number; tp: number; completedSP: number; completedTP: number } | null {
  if (row.type !== 'task') return null;

  const { task, qaTask } = row;

  const sp = getTaskStoryPoints(task);
  const tp = occupancyRowTestPointsForTotals(task, qaTask);

  const completedSP = isTaskDone(task) ? sp : 0;
  const completedTP = occupancyCompletedTestPoints(task, qaTask);

  return { sp, tp, completedSP, completedTP };
}

/**
 * Плитки «сделано / всего / %» для берндауна в том же объёме, что и суммы SP/TP в шапке «Занятость»:
 * все строки задач в представлении (объём спринта, не только размещённые на таймлайне);
 * при TP на QA-связке — «сделано» по статусу QA-задачи.
 */
export function computeBurndownTilesFromOccupancyRows(
  visibleRows: FlattenedRow[],
  taskPositions: Map<string, TaskPosition>
): BurndownTilesFromTasks {
  let totalScopeSP = 0;
  let totalScopeTP = 0;
  let completedSP = 0;
  let completedTP = 0;

  for (const row of visibleRows) {
    const d = occupancyBurndownRowDeltas(row, taskPositions);
    if (!d) continue;
    totalScopeSP += d.sp;
    totalScopeTP += d.tp;
    completedSP += d.completedSP;
    completedTP += d.completedTP;
  }

  const completionPercentSP =
    totalScopeSP === 0 ? 0 : Math.min(100, Math.max(0, Math.round((completedSP / totalScopeSP) * 100)));
  const completionPercentTP =
    totalScopeTP === 0 ? 0 : Math.min(100, Math.max(0, Math.round((completedTP / totalScopeTP) * 100)));

  return {
    completedSP,
    completedTP,
    completionPercentSP,
    completionPercentTP,
    totalScopeSP,
    totalScopeTP,
  };
}

export function buildTaskPlanHeightSignaturesMap(
  visibleRows: FlattenedRow[],
  taskPositions: Map<string, TaskPosition>
): Map<string, string> {
  const m = new Map<string, string>();
  for (const row of visibleRows) {
    if (row.type !== 'task') continue;
    m.set(row.task.id, occupancyPlanHeightSignature(row, taskPositions));
  }
  return m;
}

export function buildAssigneeIdToTaskPositions(
  tasks: Task[],
  taskPositions: Map<string, TaskPosition>
): Map<string, Array<{ taskId: string; position: TaskPosition }>> {
  const map = new Map<string, Array<{ taskId: string; position: TaskPosition }>>();
  for (const task of tasks) {
    const position = taskPositions.get(task.id);
    const assigneeId = task.assignee ?? null;
    if (position && assigneeId) {
      const list = map.get(assigneeId) ?? [];
      list.push({ taskId: task.id, position });
      map.set(assigneeId, list);
    }
  }
  return map;
}

export function computeHoverConnectedPhaseIds(params: {
  devToQaTaskId: Map<string, string>;
  hoveredPhaseTaskId: string | null;
  taskLinks: Array<{ fromTaskId: string; toTaskId: string; id: string }>;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
}): Set<string> | null {
  const { devToQaTaskId, hoveredPhaseTaskId, taskLinks, taskPositions, tasks } = params;
  if (!hoveredPhaseTaskId) return null;
  const linksWithQa: Array<{ fromTaskId: string; toTaskId: string; id: string }> = [
    ...taskLinks,
  ];
  for (const [devId, qaId] of devToQaTaskId) {
    linksWithQa.push({ fromTaskId: devId, id: `hover-qa-${devId}`, toTaskId: qaId });
  }
  const set = collectHoverConnectedTaskIds(hoveredPhaseTaskId, linksWithQa, taskPositions);
  const devId = tasks.find((t) => t.id === hoveredPhaseTaskId)?.originalTaskId;
  if (devId) set.add(devId);
  return set;
}

export function computeSourceRowPhaseIds(params: {
  devToQaTaskId: Map<string, string>;
  linkingFromTaskId: string | null;
  tasks: Task[];
}): Set<string> | null {
  const { devToQaTaskId, linkingFromTaskId, tasks } = params;
  if (!linkingFromTaskId) return null;
  const set = new Set<string>([linkingFromTaskId]);
  const task = tasks.find((t) => t.id === linkingFromTaskId);
  if (task?.originalTaskId) set.add(task.originalTaskId);
  const qaId = devToQaTaskId.get(linkingFromTaskId);
  if (qaId) set.add(qaId);
  return set;
}

export function computeSourceRowEndCellIndex(params: {
  cellsPerDay: 1 | 3;
  sourceRowPhaseIds: Set<string> | null;
  taskPositions: Map<string, TaskPosition>;
}): number | null {
  const { cellsPerDay, sourceRowPhaseIds, taskPositions } = params;
  if (!sourceRowPhaseIds || sourceRowPhaseIds.size === 0) return null;
  const ppd = cellsPerDay === 1 ? 1 : PARTS_PER_DAY;
  let maxEnd = -1;
  sourceRowPhaseIds.forEach((phaseId) => {
    const pos = taskPositions.get(phaseId);
    if (pos) {
      const end =
        cellsPerDay === 1
          ? pos.startDay + Math.max(1, Math.ceil(pos.duration / PARTS_PER_DAY))
          : pos.startDay * ppd + pos.startPart + pos.duration;
      if (end > maxEnd) maxEnd = end;
    }
  });
  return maxEnd >= 0 ? maxEnd : null;
}

export function resolveOccupancyTimelineWidths(params: {
  baseDayColumnWidth: number | undefined;
  baseTableWidth: number | undefined;
  displayAsWeeks: boolean;
  displayColumnCount: number;
  quarterlyPhaseStyle: boolean;
  sprintCount: number;
  statusColumnWidth?: number;
  taskColumnWidth: number;
  timelinePartWidth: number;
  workingDays: number;
}): { dayColumnWidth: number | undefined; tableWidth: number | undefined } {
  const {
    baseDayColumnWidth,
    baseTableWidth,
    displayAsWeeks,
    displayColumnCount,
    quarterlyPhaseStyle,
    sprintCount,
    statusColumnWidth = 0,
    taskColumnWidth,
    timelinePartWidth,
    workingDays,
  } = params;

  const baseMultiSprintDivisor = 10;
  const multiSprintDivisor = quarterlyPhaseStyle ? baseMultiSprintDivisor * 2 : baseMultiSprintDivisor;

  if (sprintCount <= 1 || timelinePartWidth <= 0) {
    return { dayColumnWidth: baseDayColumnWidth, tableWidth: baseTableWidth };
  }

  const dayColumnWidth = displayAsWeeks
    ? timelinePartWidth / displayColumnCount
    : timelinePartWidth / multiSprintDivisor;

  const tableWidth =
    taskColumnWidth +
    statusColumnWidth +
    (displayAsWeeks ? timelinePartWidth : (timelinePartWidth / multiSprintDivisor) * workingDays);

  return { dayColumnWidth, tableWidth };
}
