import type { PlanHistoryAppliedPayload } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Developer, Task } from '@/types';
import type { Dispatch, SetStateAction } from 'react';

import { getTaskPoints, isEffectivelyQaTask } from '@/features/task/utils/taskUtils';
import { updateIssueWorkForPhase } from '@/lib/beerTrackerApi';
import { timeslotsToStoryPoints } from '@/lib/pointsUtils';

type TaskRowPatch = Partial<
  Pick<Task, 'assignee' | 'assigneeName' | 'qaEngineer' | 'qaEngineerName' | 'storyPoints' | 'testPoints'>
>;

function mergeTaskRowPatch(
  patches: Map<string, TaskRowPatch>,
  taskId: string,
  partial: TaskRowPatch
): void {
  const prev = patches.get(taskId) ?? {};
  patches.set(taskId, { ...prev, ...partial });
}

function applyQaAssigneePatchForSave(
  patches: Map<string, TaskRowPatch>,
  save: PlanHistoryAppliedPayload['saves'][number],
  phaseTask: Task,
  assigneeName: string | undefined
): void {
  const devId = phaseTask.originalTaskId ?? save.devTaskKey;
  if (!devId) return;
  mergeTaskRowPatch(patches, devId, {
    qaEngineer: save.position.assignee,
    qaEngineerName: assigneeName ?? undefined,
  });
}

function applyDevAssigneePatchForSave(
  patches: Map<string, TaskRowPatch>,
  save: PlanHistoryAppliedPayload['saves'][number],
  phaseTask: Task,
  assigneeName: string | undefined
): void {
  mergeTaskRowPatch(patches, phaseTask.id, {
    assignee: save.position.assignee,
    assigneeName: assigneeName ?? undefined,
  });
}

function applyAssigneePatchForSave(
  patches: Map<string, TaskRowPatch>,
  save: PlanHistoryAppliedPayload['saves'][number],
  ctx: { developers: Developer[]; tasksMap: Map<string, Task> }
): void {
  const phaseTask = ctx.tasksMap.get(save.position.taskId);
  if (!phaseTask) return;

  const assigneeName = ctx.developers.find((d) => d.id === save.position.assignee)?.name;
  if (phaseTask.team === 'QA') {
    applyQaAssigneePatchForSave(patches, save, phaseTask, assigneeName);
    return;
  }

  applyDevAssigneePatchForSave(patches, save, phaseTask, assigneeName);
}

function resolveEffectiveIsQaForSave(
  save: PlanHistoryAppliedPayload['saves'][number],
  phaseTask: Task | undefined
): boolean {
  return save.isQa || !!(phaseTask && isEffectivelyQaTask(phaseTask));
}

function resolveDevTaskForSave(
  save: PlanHistoryAppliedPayload['saves'][number],
  effectiveIsQa: boolean,
  tasksMap: Map<string, Task>
): Task | undefined {
  if (effectiveIsQa && save.devTaskKey) {
    return tasksMap.get(save.devTaskKey);
  }
  return tasksMap.get(save.position.taskId);
}

function applyQaEstimatePatchesForSave(
  patches: Map<string, TaskRowPatch>,
  tasksMap: Map<string, Task>,
  devTargetId: string,
  newPoints: number
): void {
  mergeTaskRowPatch(patches, devTargetId, { testPoints: newPoints });
  for (const t of tasksMap.values()) {
    if (t.originalTaskId === devTargetId) {
      mergeTaskRowPatch(patches, t.id, { testPoints: newPoints });
    }
  }
}

function recordTrackerEstimateForSave(
  trackerByIssueKey: Map<string, { issueKey: string; points: number; isQa: boolean }>,
  save: PlanHistoryAppliedPayload['saves'][number],
  newPoints: number,
  effectiveIsQa: boolean
): void {
  const issueKey = effectiveIsQa && save.devTaskKey ? save.devTaskKey : save.position.taskId;
  trackerByIssueKey.set(issueKey, { issueKey, points: newPoints, isQa: effectiveIsQa });
}

function resolveEstimateDevTargetId(devTask: Task, effectiveIsQa: boolean): string {
  if (effectiveIsQa && devTask.originalTaskId) return devTask.originalTaskId;
  return devTask.id;
}

function applyEstimatePointsToPatches(
  patches: Map<string, TaskRowPatch>,
  tasksMap: Map<string, Task>,
  devTargetId: string,
  effectiveIsQa: boolean,
  newPoints: number
): void {
  if (effectiveIsQa) {
    applyQaEstimatePatchesForSave(patches, tasksMap, devTargetId, newPoints);
    return;
  }
  mergeTaskRowPatch(patches, devTargetId, { storyPoints: newPoints });
}

function applyEstimatePatchForSave(
  patches: Map<string, TaskRowPatch>,
  trackerByIssueKey: Map<string, { issueKey: string; points: number; isQa: boolean }>,
  save: PlanHistoryAppliedPayload['saves'][number],
  devTask: Task,
  effectiveIsQa: boolean,
  tasksMap: Map<string, Task>
): void {
  const currentEstimate = effectiveIsQa ? (devTask.testPoints ?? 0) : getTaskPoints(devTask);
  const newPoints = timeslotsToStoryPoints(save.position.duration);
  if (newPoints === currentEstimate) return;

  const devTargetId = resolveEstimateDevTargetId(devTask, effectiveIsQa);
  applyEstimatePointsToPatches(patches, tasksMap, devTargetId, effectiveIsQa, newPoints);
  recordTrackerEstimateForSave(trackerByIssueKey, save, newPoints, effectiveIsQa);
}

export function buildPatchesFromPlanHistorySaves(
  saves: PlanHistoryAppliedPayload['saves'],
  ctx: { developers: Developer[]; tasksMap: Map<string, Task> }
): {
  patches: Map<string, TaskRowPatch>;
  trackerByIssueKey: Map<string, { issueKey: string; points: number; isQa: boolean }>;
} {
  const patches = new Map<string, TaskRowPatch>();
  const trackerByIssueKey = new Map<string, { issueKey: string; points: number; isQa: boolean }>();

  for (const save of saves) {
    applyAssigneePatchForSave(patches, save, ctx);

    const phaseTask = ctx.tasksMap.get(save.position.taskId);
    const effectiveIsQa = resolveEffectiveIsQaForSave(save, phaseTask);
    const devTask = resolveDevTaskForSave(save, effectiveIsQa, ctx.tasksMap);
    if (!devTask) continue;

    applyEstimatePatchForSave(patches, trackerByIssueKey, save, devTask, effectiveIsQa, ctx.tasksMap);
  }

  return { patches, trackerByIssueKey };
}

export function syncTrackerEstimatesAfterPlanHistory(
  trackerByIssueKey: Map<string, { issueKey: string; points: number; isQa: boolean }>
): void {
  for (const { issueKey, points, isQa } of trackerByIssueKey.values()) {
    updateIssueWorkForPhase(issueKey, points, isQa).catch((err) => {
      console.error('Re-estimate after plan undo/redo failed:', err);
    });
  }
}

export function applyTaskRowPatches(
  patches: Map<string, TaskRowPatch>,
  setTasks: Dispatch<SetStateAction<Task[]>>
): void {
  if (patches.size === 0) return;

  setTasks((prev) => {
    let changed = false;
    const next = prev.map((t) => {
      const p = patches.get(t.id);
      if (!p) return t;
      changed = true;
      return { ...t, ...p };
    });
    return changed ? next : prev;
  });
}
