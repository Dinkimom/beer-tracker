import type { GetTaskInfoFn } from '@/lib/layers/data/taskPositionsTypes';
import type { TaskPosition } from '@/types';

import { stripPositionSource } from '@/lib/layers/data/mappers/taskPositionToApi';

import {
  planHistorySideEffectsHaveChange,
  resolveAppliedComments,
  resolveAppliedTaskParents,
  type PlanHistoryAppliedPayload,
  type PlanHistorySideEffects,
  type PlanHistoryStep,
  type PositionHistoryValue,
} from './planHistoryTypes';

function positionHistoryValuesEqual(
  left: PositionHistoryValue,
  right: PositionHistoryValue
): boolean {
  const normalize = (value: PositionHistoryValue) =>
    value == null ? null : stripPositionSource(value);
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

export function historyStepHasChange(step: PlanHistoryStep): boolean {
  const taskIds = new Set([...step.before.keys(), ...step.after.keys()]);
  for (const taskId of taskIds) {
    if (!positionHistoryValuesEqual(step.before.get(taskId) ?? null, step.after.get(taskId) ?? null)) {
      return true;
    }
  }
  return planHistorySideEffectsHaveChange({
    comments: step.comments,
    taskParents: step.taskParents,
  });
}

function withSideEffects(
  step: PlanHistoryStep,
  sideEffects?: PlanHistorySideEffects
): PlanHistoryStep {
  if (!sideEffects) {
    return step;
  }
  return {
    ...step,
    comments: sideEffects.comments,
    taskParents: sideEffects.taskParents,
  };
}

export function pendingUpdateForPosition(
  resolveTaskInfo: GetTaskInfoFn | undefined,
  position: TaskPosition
): { devTaskKey?: string; isQa: boolean; position: TaskPosition } {
  const info = resolveTaskInfo ? resolveTaskInfo(position.taskId) : { isQa: false };
  return {
    devTaskKey: info.devTaskKey,
    isQa: info.isQa,
    position,
  };
}

export function planHistoryAppliedPayload(
  values: ReadonlyMap<string, PositionHistoryValue>,
  step: PlanHistoryStep,
  direction: 'after' | 'before',
  resolveTaskInfo: GetTaskInfoFn | undefined
): PlanHistoryAppliedPayload | null {
  const saves = [];
  for (const position of values.values()) {
    if (position != null) {
      saves.push(pendingUpdateForPosition(resolveTaskInfo, position));
    }
  }
  const taskParents = resolveAppliedTaskParents(step, direction);
  const comments = resolveAppliedComments(step, direction);
  if (saves.length === 0 && !taskParents && !comments) {
    return null;
  }
  return { comments, saves, taskParents };
}

export function historyStepForTask(
  positions: ReadonlyMap<string, TaskPosition>,
  taskId: string,
  nextPosition: PositionHistoryValue,
  sideEffects?: PlanHistorySideEffects
): PlanHistoryStep {
  return withSideEffects(
    {
      after: new Map([[taskId, nextPosition == null ? null : stripPositionSource(nextPosition)]]),
      before: new Map([[taskId, positions.get(taskId) ?? null]]),
    },
    sideEffects
  );
}

export function historyStepForMap(
  positions: ReadonlyMap<string, TaskPosition>,
  updated: ReadonlyMap<string, TaskPosition>,
  sideEffects?: PlanHistorySideEffects
): PlanHistoryStep {
  const taskIds = new Set<string>([...positions.keys(), ...updated.keys()]);
  const before = new Map<string, PositionHistoryValue>();
  const after = new Map<string, PositionHistoryValue>();
  for (const taskId of taskIds) {
    before.set(taskId, positions.get(taskId) ?? null);
    after.set(taskId, updated.get(taskId) ?? null);
  }
  return withSideEffects({ after, before }, sideEffects);
}
