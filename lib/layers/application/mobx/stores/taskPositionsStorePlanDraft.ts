import type { TaskPosition } from '@/types';

import { runInAction } from 'mobx';

import { isValidSprintId, stripPositionSource } from '@/lib/layers/data/mappers/taskPositionToApi';

import { flushPendingPositionUpdates } from './taskPositionsStoreSaveHelpers';

interface PendingUpdate {
  devTaskKey?: string;
  isQa: boolean;
  position: TaskPosition;
}

export interface PlanDraftState {
  draftTaskIds: Set<string>;
  pendingUpdates: Map<string, PendingUpdate>;
  positions: Map<string, TaskPosition>;
  sprintId: number | null;
  syncAssignees: boolean;
  resolveTaskInfo: (taskId: string) => { devTaskKey?: string; isQa: boolean };
}

export function countVisiblePlanDrafts(
  draftTaskIds: ReadonlySet<string>,
  positions: ReadonlyMap<string, TaskPosition>
): number {
  let count = 0;
  for (const taskId of draftTaskIds) {
    if (positions.has(taskId)) {
      count += 1;
    }
  }
  return count;
}

export function snapshotPlanDraftPositions(
  draftTaskIds: ReadonlySet<string>,
  positions: ReadonlyMap<string, TaskPosition>
): Map<string, TaskPosition> {
  const keep = new Map<string, TaskPosition>();
  for (const taskId of draftTaskIds) {
    const position = positions.get(taskId);
    if (position) {
      keep.set(taskId, position);
    }
  }
  return keep;
}

export function restorePlanDraftPositions(
  positions: Map<string, TaskPosition>,
  keep: ReadonlyMap<string, TaskPosition>
): void {
  keep.forEach((position, taskId) => {
    positions.set(taskId, position);
  });
}

export function replacePlanDraft(state: PlanDraftState, positions: readonly TaskPosition[]): void {
  runInAction(() => {
    for (const taskId of state.draftTaskIds) {
      state.positions.delete(taskId);
      state.pendingUpdates.delete(taskId);
    }
    state.draftTaskIds.clear();
    for (const position of positions) {
      const stored = stripPositionSource(position);
      state.positions.set(stored.taskId, stored);
      state.draftTaskIds.add(stored.taskId);
    }
  });
}

export function clearPlanDraft(state: PlanDraftState): void {
  runInAction(() => {
    for (const taskId of state.draftTaskIds) {
      state.positions.delete(taskId);
      state.pendingUpdates.delete(taskId);
    }
    state.draftTaskIds.clear();
  });
}

export async function commitPlanDraft(state: PlanDraftState): Promise<{ count: number; ok: boolean }> {
  if (!isValidSprintId(state.sprintId)) {
    return { count: 0, ok: false };
  }
  const sprintId = state.sprintId;
  const updates = new Map<string, PendingUpdate>();
  for (const taskId of state.draftTaskIds) {
    const position = state.positions.get(taskId);
    if (!position) {
      continue;
    }
    const info = state.resolveTaskInfo(taskId);
    updates.set(taskId, { position, isQa: info.isQa, devTaskKey: info.devTaskKey });
  }
  if (updates.size === 0) {
    runInAction(() => {
      state.draftTaskIds.clear();
    });
    return { count: 0, ok: true };
  }
  try {
    await flushPendingPositionUpdates(sprintId, updates, state.syncAssignees, new Map());
  } catch {
    return { count: 0, ok: false };
  }
  runInAction(() => {
    state.draftTaskIds.clear();
  });
  return { count: updates.size, ok: true };
}

export function keepPlanDraftPosition(state: PlanDraftState, position: TaskPosition): boolean {
  if (!state.draftTaskIds.has(position.taskId)) {
    return false;
  }
  runInAction(() => {
    state.positions.set(position.taskId, stripPositionSource(position));
  });
  state.pendingUpdates.delete(position.taskId);
  return true;
}

export function dropPlanDraftPosition(state: PlanDraftState, taskId: string): boolean {
  if (!state.draftTaskIds.has(taskId)) {
    return false;
  }
  runInAction(() => {
    state.positions.delete(taskId);
    state.draftTaskIds.delete(taskId);
  });
  state.pendingUpdates.delete(taskId);
  return true;
}
