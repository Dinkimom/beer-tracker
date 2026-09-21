import type { GetTaskInfoFn } from '@/lib/layers/data/taskPositionsTypes';
import type { TaskPosition } from '@/types';

import { action, computed, makeObservable, observable, runInAction } from 'mobx';

import {
  deleteTaskPosition as deleteTaskPositionApi,
  fetchSprintPositions,
  saveTaskPosition,
} from '@/lib/beerTrackerApi';
import {
  isValidSprintId,
  stripPositionSource,
  taskPositionToApi,
} from '@/lib/layers/data/mappers/taskPositionToApi';
import { isEphemeralPlannerPositionId } from '@/lib/planner/ephemeralPlannerPositionId';
import { DELAYS } from '@/utils/constants';

import {
  planHistorySideEffectsHaveChange,
  resolveAppliedComments,
  resolveAppliedTaskParents,
  type PlanHistoryAppliedPayload,
  type PlanHistoryAppliedSave,
  type PlanHistorySideEffects,
  type PlanHistoryStep,
  type PositionHistoryOptions,
  type PositionHistoryValue,
} from './planHistoryTypes';
import { flushPendingPositionUpdates, flushPendingPositionUpdatesQuietly } from './taskPositionsStoreSaveHelpers';

export type {
  CommentHistorySlice,
  PlanHistoryAppliedPayload,
  PositionHistoryOptions,
} from './planHistoryTypes';
export {
  commentHistorySliceFromComment,
  commentHistorySlicesEqual,
} from './planHistoryTypes';

interface PendingUpdate { devTaskKey?: string; isQa: boolean; position: TaskPosition }

const MAX_PLAN_HISTORY_STEPS = 5;

/**
 * Позиции задач на спринте (карты на свимлейне / занятости) + синхронизация с API.
 * Один экземпляр на приложение (как планер спринта).
 */
export class TaskPositionsStore {
  /** taskId → позиция */
  positions = observable.map<string, TaskPosition>();

  undoStack: PlanHistoryStep[] = [];

  redoStack: PlanHistoryStep[] = [];

  /**
   * Идёт хотя бы один in-flight `fetchSprintPositions` для валидного спринта.
   * Нужен для полноэкранного лоадера до согласования списка «без позиции» в сайдбаре и доски.
   */
  positionsLoadPending = false;

  /** Последний спринт, для которого завершилась текущая волна загрузок позиций (inFlight → 0). */
  positionsSettledSprintId: number | null = null;

  private positionsFetchInFlight = 0;

  private debounceTimerRef: NodeJS.Timeout | null = null;

  private pendingUpdatesRef = new Map<string, PendingUpdate>();

  private resolveGetTaskInfo: () => GetTaskInfoFn | undefined = () => undefined;

  private sprintId: number | null = null;

  private syncAssignees = true;

  /**
   * Счётчик для отбрасывания устаревших ответов `fetchSprintPositions`.
   * Увеличивается при каждом старте loadSprint и при любой локальной мутации позиций,
   * чтобы ответ загрузки, пришедший после DnD/сохранения, не делал `clear()` и не затирал UI.
   */
  private reconcileGeneration = 0;

  private isApplyingHistory = false;

  private onPlanHistoryApplied?: (payload: PlanHistoryAppliedPayload) => void;

  constructor() {
    makeObservable(this, {
      deletePosition: action,
      canRedo: computed,
      canUndo: computed,
      loadSprint: action,
      positions: observable,
      positionsLoadPending: observable,
      positionsSettledSprintId: observable,
      recordPlanHistory: action,
      redo: action,
      redoStack: observable.shallow,
      savePosition: action,
      setOnPlanHistoryApplied: action,
      setPositionsWithSave: action,
      setResolveGetTaskInfo: action,
      setSyncAssigneesFlag: action,
      undo: action,
      undoStack: observable.shallow,
    });
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private bumpReconcileGeneration(): void {
    this.reconcileGeneration++;
  }

  private positionsEqual(a: PositionHistoryValue, b: PositionHistoryValue): boolean {
    return JSON.stringify(a == null ? null : stripPositionSource(a)) ===
      JSON.stringify(b == null ? null : stripPositionSource(b));
  }

  private historyStepHasChange(step: PlanHistoryStep): boolean {
    const positionChanged = Array.from(new Set([...step.before.keys(), ...step.after.keys()])).some(
      (taskId) => !this.positionsEqual(step.before.get(taskId) ?? null, step.after.get(taskId) ?? null)
    );
    if (positionChanged) {
      return true;
    }
    return planHistorySideEffectsHaveChange({
      comments: step.comments,
      taskParents: step.taskParents,
    });
  }

  private recordHistoryStep(step: PlanHistoryStep): void {
    if (this.isApplyingHistory) {
      return;
    }

    if (!this.historyStepHasChange(step)) {
      return;
    }

    this.undoStack.push(step);
    if (this.undoStack.length > MAX_PLAN_HISTORY_STEPS) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  private attachSideEffects(
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

  private buildHistoryStepForTask(
    taskId: string,
    nextPosition: PositionHistoryValue,
    sideEffects?: PlanHistorySideEffects
  ): PlanHistoryStep {
    return this.attachSideEffects(
      {
        after: new Map([[taskId, nextPosition == null ? null : stripPositionSource(nextPosition)]]),
        before: new Map([[taskId, this.positions.get(taskId) ?? null]]),
      },
      sideEffects
    );
  }

  private buildHistoryStepForMap(
    updated: Map<string, TaskPosition>,
    sideEffects?: PlanHistorySideEffects
  ): PlanHistoryStep {
    const taskIds = new Set<string>([...this.positions.keys(), ...updated.keys()]);
    const before = new Map<string, PositionHistoryValue>();
    const after = new Map<string, PositionHistoryValue>();

    taskIds.forEach((taskId) => {
      before.set(taskId, this.positions.get(taskId) ?? null);
      after.set(taskId, updated.get(taskId) ?? null);
    });

    return this.attachSideEffects({ after, before }, sideEffects);
  }

  /**
   * Записать шаг истории плана (позиции и/или side-effects).
   * Для comment-only / parent-only шагов передайте пустые карты позиций.
   */
  recordPlanHistory(step: PlanHistoryStep): void {
    this.recordHistoryStep({
      after: step.after,
      before: step.before,
      comments: step.comments,
      taskParents: step.taskParents,
    });
  }

  private getPendingUpdateForPosition(position: TaskPosition): PendingUpdate {
    const fn = this.resolveGetTaskInfo();
    const info = fn ? fn(position.taskId) : { isQa: false };
    return {
      devTaskKey: info.devTaskKey,
      isQa: info.isQa,
      position,
    };
  }

  private notifyPlanHistoryApplied(
    values: Map<string, PositionHistoryValue>,
    step: PlanHistoryStep,
    direction: 'after' | 'before'
  ): void {
    if (!this.onPlanHistoryApplied) return;

    const saves: PlanHistoryAppliedSave[] = [];
    values.forEach((position) => {
      if (position != null) {
        saves.push(this.getPendingUpdateForPosition(position));
      }
    });
    const taskParents = resolveAppliedTaskParents(step, direction);
    const comments = resolveAppliedComments(step, direction);
    if (saves.length === 0 && !taskParents && !comments) {
      return;
    }

    this.onPlanHistoryApplied({ comments, saves, taskParents });
  }

  private async syncHistoryStepValues(values: Map<string, PositionHistoryValue>): Promise<void> {
    if (!isValidSprintId(this.sprintId)) return;
    const sprintId = this.sprintId!;

    const saves: PendingUpdate[] = [];
    const deletes: string[] = [];
    values.forEach((position, taskId) => {
      this.pendingUpdatesRef.delete(taskId);
      if (position == null) {
        deletes.push(taskId);
      } else {
        saves.push(this.getPendingUpdateForPosition(position));
      }
    });

    await Promise.all([
      ...deletes.map((taskId) =>
        deleteTaskPositionApi(sprintId, taskId).catch((error) => {
          console.error('Error deleting position during history apply:', error);
        })
      ),
      ...saves.map(({ position, isQa, devTaskKey }) => {
        const apiData = {
          ...taskPositionToApi(position, isQa, devTaskKey),
          syncAssignee: this.syncAssignees,
        };
        return saveTaskPosition(sprintId, apiData).catch((error) => {
          console.error('Error saving position during history apply:', error);
        });
      }),
    ]);
  }

  private applyHistoryValues(values: Map<string, PositionHistoryValue>): void {
    this.bumpReconcileGeneration();
    runInAction(() => {
      values.forEach((position, taskId) => {
        if (position == null) {
          this.positions.delete(taskId);
        } else {
          this.positions.set(taskId, stripPositionSource(position));
        }
      });
    });
  }

  undo(): void {
    const step = this.undoStack.pop();
    if (!step) return;

    this.isApplyingHistory = true;
    this.applyHistoryValues(step.before);
    this.isApplyingHistory = false;
    this.notifyPlanHistoryApplied(step.before, step, 'before');
    this.redoStack.push(step);
    this.syncHistoryStepValues(step.before).catch(() => undefined);
  }

  redo(): void {
    const step = this.redoStack.pop();
    if (!step) return;

    this.isApplyingHistory = true;
    this.applyHistoryValues(step.after);
    this.isApplyingHistory = false;
    this.notifyPlanHistoryApplied(step.after, step, 'after');
    this.undoStack.push(step);
    this.syncHistoryStepValues(step.after).catch(() => undefined);
  }

  setOnPlanHistoryApplied(handler?: (payload: PlanHistoryAppliedPayload) => void): void {
    this.onPlanHistoryApplied = handler;
  }

  setResolveGetTaskInfo(fn: () => GetTaskInfoFn | undefined): void {
    this.resolveGetTaskInfo = fn;
  }

  setSyncAssigneesFlag(syncAssignees: boolean): void {
    this.syncAssignees = syncAssignees;
  }

  async loadSprint(sprintId: number | null): Promise<void> {
    if (!isValidSprintId(sprintId)) {
      this.sprintId = sprintId;
      this.reconcileGeneration++;
      runInAction(() => {
        this.positions.clear();
        this.undoStack = [];
        this.redoStack = [];
        this.positionsFetchInFlight = 0;
        this.positionsLoadPending = false;
        this.positionsSettledSprintId = null;
      });
      return;
    }

    // Уже загрузили позиции для этого спринта и нет параллельного fetch — выходим без bump gen / pending.
    // Иначе повторный вызов из useTaskPositionsApi при монтировании планера включает positionsLoadPending,
    // полноэкранный лоадер снова скрывает SprintPlanner → размонтирование → бесконечный цикл.
    if (
      this.sprintId === sprintId &&
      this.positionsSettledSprintId === sprintId &&
      this.positionsFetchInFlight === 0
    ) {
      return Promise.resolve();
    }

    const sprintChanged = this.sprintId !== sprintId;
    this.sprintId = sprintId;
    const myGen = ++this.reconcileGeneration;

    runInAction(() => {
      if (sprintChanged) {
        this.undoStack = [];
        this.redoStack = [];
      }
      this.positionsFetchInFlight++;
      this.positionsLoadPending = true;
    });

    try {
      const data = await fetchSprintPositions(sprintId);
      if (myGen !== this.reconcileGeneration) {
        return;
      }
      runInAction(() => {
        this.positions.clear();
        if (data && Array.isArray(data)) {
          data.forEach((position: TaskPosition) => {
            this.positions.set(position.taskId, position);
          });
        }
      });
    } catch (error) {
      console.error('Error loading positions:', error);
    } finally {
      runInAction(() => {
        this.positionsFetchInFlight = Math.max(0, this.positionsFetchInFlight - 1);
        this.positionsLoadPending = this.positionsFetchInFlight > 0;
        if (this.positionsFetchInFlight === 0 && isValidSprintId(this.sprintId)) {
          this.positionsSettledSprintId = this.sprintId;
        }
      });
    }
  }

  savePosition(
    position: TaskPosition,
    isQa: boolean = false,
    devTaskKey?: string,
    immediate = false,
    options?: PositionHistoryOptions
  ): Promise<void> {
    if (!isValidSprintId(this.sprintId)) {
      return Promise.resolve();
    }

    const sprintId = this.sprintId!;

    if (options?.recordHistory) {
      this.recordHistoryStep(
        this.buildHistoryStepForTask(position.taskId, position, options.sideEffects)
      );
    }

    this.bumpReconcileGeneration();
    runInAction(() => {
      this.positions.set(position.taskId, stripPositionSource(position));
    });

    if (immediate) {
      this.pendingUpdatesRef.delete(position.taskId);
      if (isEphemeralPlannerPositionId(position.taskId)) {
        return Promise.resolve();
      }
      const apiData = {
        ...taskPositionToApi(position, isQa, devTaskKey),
        syncAssignee: this.syncAssignees,
      };
      return saveTaskPosition(sprintId, apiData).then(() => undefined);
    }

    this.pendingUpdatesRef.set(position.taskId, { position, isQa, devTaskKey });

    if (this.debounceTimerRef) {
      clearTimeout(this.debounceTimerRef);
    }

    const delay = immediate ? 0 : DELAYS.DEBOUNCE;
    return new Promise((resolve, reject) => {
      this.debounceTimerRef = setTimeout(async () => {
        const updates = new Map(this.pendingUpdatesRef);
        this.pendingUpdatesRef.clear();
        try {
          await flushPendingPositionUpdates(
            sprintId,
            updates,
            this.syncAssignees,
            this.pendingUpdatesRef
          );
          resolve();
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }

  async deletePosition(taskId: string, options?: PositionHistoryOptions): Promise<void> {
    if (!isValidSprintId(this.sprintId)) return;

    const sprintId = this.sprintId!;

    if (options?.recordHistory) {
      this.recordHistoryStep(this.buildHistoryStepForTask(taskId, null, options.sideEffects));
    }

    this.bumpReconcileGeneration();
    runInAction(() => {
      this.positions.delete(taskId);
    });

    this.pendingUpdatesRef.delete(taskId);

    if (isEphemeralPlannerPositionId(taskId)) {
      return;
    }

    try {
      await deleteTaskPositionApi(sprintId, taskId);
    } catch (error) {
      console.error('Error deleting position:', error);
    }
  }

  setPositionsWithSave(
    newPositions: Map<string, TaskPosition> | ((prev: Map<string, TaskPosition>) => Map<string, TaskPosition>),
    options?: PositionHistoryOptions
  ): void {
    this.bumpReconcileGeneration();
    const prev = new Map(this.positions);
    const updated =
      typeof newPositions === 'function' ? newPositions(prev) : newPositions;

    if (options?.recordHistory) {
      this.recordHistoryStep(this.buildHistoryStepForMap(updated, options.sideEffects));
    }

    const changed = new Map<string, TaskPosition>();
    updated.forEach((pos, taskId) => {
      const oldPos = prev.get(taskId);
      if (!oldPos || JSON.stringify(oldPos) !== JSON.stringify(pos)) {
        changed.set(taskId, pos);
      }
    });

    runInAction(() => {
      this.positions.clear();
      updated.forEach((pos, taskId) => {
        this.positions.set(taskId, pos);
      });
    });

    if (changed.size === 0) {
      return;
    }

    if (this.debounceTimerRef) {
      clearTimeout(this.debounceTimerRef);
    }

    changed.forEach((pos) => {
      const fn = this.resolveGetTaskInfo();
      const info = fn ? fn(pos.taskId) : { isQa: false };
      this.pendingUpdatesRef.set(pos.taskId, {
        position: pos,
        isQa: info.isQa,
        devTaskKey: info.devTaskKey,
      });
    });

    this.debounceTimerRef = setTimeout(async () => {
      const updates = new Map(this.pendingUpdatesRef);
      this.pendingUpdatesRef.clear();

      if (!isValidSprintId(this.sprintId)) return;
      const sprintId = this.sprintId!;

      await flushPendingPositionUpdatesQuietly(
        sprintId,
        updates,
        this.syncAssignees,
        this.pendingUpdatesRef
      );
    }, DELAYS.DEBOUNCE);
  }

  /**
   * Подтянуть позиции с сервера без лоадера: локальные pending-правки не затираем.
   */
  async reconcileRemoteSprint(sprintId: number): Promise<void> {
    if (this.sprintId !== sprintId || !isValidSprintId(sprintId)) {
      return;
    }
    if (this.positionsFetchInFlight > 0) {
      return;
    }
    try {
      const data = await fetchSprintPositions(sprintId);
      if (this.sprintId !== sprintId) {
        return;
      }
      const pending = this.pendingUpdatesRef;
      runInAction(() => {
        const next = new Map<string, TaskPosition>();
        if (data && Array.isArray(data)) {
          for (const position of data) {
            if (!pending.has(position.taskId)) {
              next.set(position.taskId, position);
            }
          }
        }
        for (const [taskId, update] of pending) {
          next.set(taskId, stripPositionSource(update.position));
        }
        this.positions.clear();
        next.forEach((position, taskId) => {
          this.positions.set(taskId, position);
        });
      });
    } catch (error) {
      console.error('Error reconciling remote positions:', error);
    }
  }
}
