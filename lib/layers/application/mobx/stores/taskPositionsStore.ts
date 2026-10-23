import type { SprintPlanAnchor } from '@/lib/api/sprints';
import type { GetTaskInfoFn } from '@/lib/layers/data/taskPositionsTypes';
import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';
import type { TaskPosition } from '@/types';

import { action, computed, makeObservable, observable, runInAction } from 'mobx';

import { deleteTaskPosition as deleteTaskPositionApi, saveTaskPosition } from '@/lib/beerTrackerApi';
import { isValidSprintId, stripPositionSource, taskPositionToApi } from '@/lib/layers/data/mappers/taskPositionToApi';
import { isEphemeralPlannerPositionId } from '@/lib/planner/ephemeralPlannerPositionId';
import { DELAYS } from '@/utils/constants';

import {
  type PlanHistoryAppliedPayload,
  type PlanHistoryStep,
  type PositionHistoryOptions,
  type PositionHistoryValue,
} from './planHistoryTypes';
import { SwimlaneLaneLayersStore } from './swimlaneLaneLayersStore';
import {
  historyStepForMap,
  historyStepForTask,
  historyStepHasChange,
  pendingUpdateForPosition,
  planHistoryAppliedPayload,
  withStagedLaneLayers,
} from './taskPositionsStoreHistory';
import {
  fetchSprintPositionsBundle,
  mergeRemotePositions,
  replacePlanAnchors,
  replacePlanPatchPreviews,
} from './taskPositionsStoreLoadHelpers';
import {
  clearPlanDraft,
  commitPlanDraft as commitStoredPlanDraft,
  countVisiblePlanDrafts,
  dropPlanDraftPosition,
  keepPlanDraftPosition,
  replacePlanDraft,
  restorePlanDraftPositions,
  snapshotPlanDraftPositions,
  type PlanDraftState,
} from './taskPositionsStorePlanDraft';
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

  /** Локальный черновик раскладки: на доске, без записи, пока его не сохранят или не отменят. */
  draftTaskIds = observable.set<string>();

  /** taskId → план на момент перехода в работу */
  planAnchors = observable.map<string, SprintPlanAnchor>();

  /** Предложения агента по позициям: перенос, длина, снятие с доски. */
  planPatchPreviews = observable.map<string, PlanPatchPositionPreview>();

  /** Ручные слои карточек в строках свимлейна. */
  readonly laneLayers = new SwimlaneLaneLayersStore(
    () => this.sprintId,
    (laneLayers) => this.recordHistoryStep({ after: new Map(), before: new Map(), laneLayers })
  );

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

  /** In-flight `loadSprint` for the current sprint — coalesces remount / dual-hook callers. */
  private loadSprintInFlight: Promise<void> | null = null;

  private loadSprintInFlightGen = 0;

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
      draftTaskIds: observable,
      canRedo: computed,
      planDraftCount: computed,
      canUndo: computed,
      loadSprint: action,
      planAnchors: observable,
      planPatchPreviews: observable,
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

  get planDraftCount(): number {
    return countVisiblePlanDrafts(this.draftTaskIds, this.positions);
  }

  private bumpReconcileGeneration(): void {
    this.reconcileGeneration++;
  }

  private planDraftState(): PlanDraftState {
    return {
      draftTaskIds: this.draftTaskIds,
      pendingUpdates: this.pendingUpdatesRef,
      positions: this.positions,
      resolveTaskInfo: (taskId) => this.resolveGetTaskInfo()?.(taskId) ?? { isQa: false },
      sprintId: this.sprintId,
      syncAssignees: this.syncAssignees,
    };
  }

  /** Показать черновик на доске, не записывая его. Предыдущий черновик снимается. */
  stagePlanDraft(positions: readonly TaskPosition[], taskIdsWithoutPosition?: readonly string[]): void {
    this.bumpReconcileGeneration();
    replacePlanDraft(this.planDraftState(), positions, taskIdsWithoutPosition);
  }

  discardPlanDraft(): void {
    this.bumpReconcileGeneration();
    clearPlanDraft(this.planDraftState());
  }

  commitPlanDraft(): Promise<{ count: number; ok: boolean }> {
    return commitStoredPlanDraft(this.planDraftState());
  }

  private recordHistoryStep(input: PlanHistoryStep): void {
    if (this.isApplyingHistory) {
      return;
    }

    const step = withStagedLaneLayers(input, this.laneLayers.takeStagedHistory());
    if (!historyStepHasChange(step)) {
      return;
    }

    this.undoStack.push(step);
    if (this.undoStack.length > MAX_PLAN_HISTORY_STEPS) {
      this.undoStack.shift();
    }
    this.redoStack = [];
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

  private notifyPlanHistoryApplied(
    values: Map<string, PositionHistoryValue>,
    step: PlanHistoryStep,
    direction: 'after' | 'before'
  ): void {
    const payload = planHistoryAppliedPayload(values, step, direction, this.resolveGetTaskInfo());
    if (payload) {
      this.onPlanHistoryApplied?.(payload);
    }
  }

  private async syncHistoryStepValues(values: Map<string, PositionHistoryValue>): Promise<void> {
    if (!isValidSprintId(this.sprintId)) return;
    const sprintId = this.sprintId!;

    const saves: PendingUpdate[] = [];
    const deletes: string[] = [];
    values.forEach((position, taskId) => {
      this.pendingUpdatesRef.delete(taskId);
      if (this.draftTaskIds.has(taskId)) {
        return;
      }
      if (position == null) {
        deletes.push(taskId);
      } else {
        saves.push(pendingUpdateForPosition(this.resolveGetTaskInfo(), position));
      }
    });

    await Promise.all([
      ...deletes.map((taskId) => {
        const info = this.resolveGetTaskInfo()?.(taskId) ?? { isQa: false };
        return deleteTaskPositionApi(sprintId, taskId, {
          isQa: info.isQa,
          ...(info.devTaskKey ? { devTaskKey: info.devTaskKey } : {}),
        }).catch((error) => {
          console.error('Error deleting position during history apply:', error);
        });
      }),
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

  /** Применить шаг истории в сторону `direction` (undo → before, redo → after). */
  private applyHistoryStep(step: PlanHistoryStep, direction: 'after' | 'before'): void {
    const values = step[direction];
    this.isApplyingHistory = true;
    this.applyHistoryValues(values);
    this.laneLayers.applyHistory(step.laneLayers, direction);
    this.isApplyingHistory = false;
    this.notifyPlanHistoryApplied(values, step, direction);
    this.syncHistoryStepValues(values).catch(() => undefined);
  }

  undo(): void {
    const step = this.undoStack.pop();
    if (!step) return;
    this.applyHistoryStep(step, 'before');
    this.redoStack.push(step);
  }

  redo(): void {
    const step = this.redoStack.pop();
    if (!step) return;
    this.applyHistoryStep(step, 'after');
    this.undoStack.push(step);
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

  loadSprint(sprintId: number | null): Promise<void> {
    if (!isValidSprintId(sprintId)) {
      this.sprintId = sprintId;
      this.loadSprintInFlight = null;
      this.loadSprintInFlightGen = 0;
      this.reconcileGeneration++;
      runInAction(() => {
        this.positions.clear();
        this.planAnchors.clear(); this.planPatchPreviews.clear(); this.laneLayers.clear();
        this.draftTaskIds.clear();
        this.undoStack = [];
        this.redoStack = [];
        this.positionsFetchInFlight = 0;
        this.positionsLoadPending = false;
        this.positionsSettledSprintId = null;
      });
      return Promise.resolve();
    }

    // Settled + idle: skip (avoids remount↔pending loader loop with useTaskPositionsApi).
    if (
      this.sprintId === sprintId &&
      this.positionsSettledSprintId === sprintId &&
      this.positionsFetchInFlight === 0
    ) {
      return Promise.resolve();
    }
    if (this.sprintId === sprintId && this.loadSprintInFlight) {
      return this.loadSprintInFlight;
    }

    const sprintChanged = this.sprintId !== sprintId;
    this.sprintId = sprintId;
    const myGen = ++this.reconcileGeneration;
    runInAction(() => {
      if (sprintChanged) {
        this.undoStack = [];
        this.redoStack = [];
        this.draftTaskIds.clear(); this.planPatchPreviews.clear(); this.laneLayers.clear();
      }
      this.positionsFetchInFlight++;
      this.positionsLoadPending = true;
    });

    const draftKeep = snapshotPlanDraftPositions(this.draftTaskIds, this.positions);
    const loadPromise = this.fetchAndApplySprintLoad(sprintId, myGen, draftKeep);
    this.loadSprintInFlight = loadPromise;
    this.loadSprintInFlightGen = myGen;
    return loadPromise;
  }

  private async fetchAndApplySprintLoad(
    sprintId: number,
    myGen: number,
    draftKeep: Map<string, TaskPosition>
  ): Promise<void> {
    try {
      const { anchors, laneLayers, positions: data, previews } = await fetchSprintPositionsBundle(sprintId);
      if (myGen !== this.reconcileGeneration) return;
      runInAction(() => {
        this.positions.clear();
        data.forEach((position) => {
          this.positions.set(position.taskId, position);
        });
        restorePlanDraftPositions(this.positions, draftKeep);
        replacePlanAnchors(this.planAnchors, anchors);
        replacePlanPatchPreviews(this.planPatchPreviews, previews);
        this.laneLayers.replaceFromServer(laneLayers);
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
      if (this.loadSprintInFlightGen === myGen) this.loadSprintInFlight = null;
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

    if (keepPlanDraftPosition(this.planDraftState(), position)) {
      this.bumpReconcileGeneration();
      return Promise.resolve();
    }

    const sprintId = this.sprintId!;

    if (options?.recordHistory) {
      this.recordHistoryStep(
        historyStepForTask(this.positions, position.taskId, position, options.sideEffects)
      );
    }

    this.bumpReconcileGeneration();
    runInAction(() => {
      this.positions.set(position.taskId, stripPositionSource(position));
    });
    this.laneLayers.touch(position.taskId);

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

    if (dropPlanDraftPosition(this.planDraftState(), taskId)) {
      this.bumpReconcileGeneration();
      return;
    }

    const sprintId = this.sprintId!;

    if (options?.recordHistory) {
      this.recordHistoryStep(historyStepForTask(this.positions, taskId, null, options.sideEffects));
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
      const info = this.resolveGetTaskInfo()?.(taskId) ?? { isQa: false };
      await deleteTaskPositionApi(sprintId, taskId, {
        isQa: info.isQa,
        ...(info.devTaskKey ? { devTaskKey: info.devTaskKey } : {}),
      });
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

    const changed = new Map<string, TaskPosition>();
    updated.forEach((pos, taskId) => {
      const oldPos = prev.get(taskId);
      if (!oldPos || JSON.stringify(oldPos) !== JSON.stringify(pos)) {
        changed.set(taskId, pos);
      }
    });

    const historyTouchesSaved = Array.from(changed.keys()).some((taskId) => !this.draftTaskIds.has(taskId));
    if (options?.recordHistory && historyTouchesSaved) {
      this.recordHistoryStep(historyStepForMap(this.positions, updated, options.sideEffects));
    }

    runInAction(() => {
      this.positions.clear();
      updated.forEach((pos, taskId) => {
        this.positions.set(taskId, pos);
      });
    });

    if (changed.size === 0) {
      return;
    }
    for (const taskId of changed.keys()) this.laneLayers.touch(taskId);

    let queuedPersist = false;
    changed.forEach((pos) => {
      if (this.draftTaskIds.has(pos.taskId)) {
        return;
      }
      queuedPersist = true;
      const fn = this.resolveGetTaskInfo();
      const info = fn ? fn(pos.taskId) : { isQa: false };
      this.pendingUpdatesRef.set(pos.taskId, {
        position: pos,
        isQa: info.isQa,
        devTaskKey: info.devTaskKey,
      });
    });

    if (!queuedPersist) {
      return;
    }

    if (this.debounceTimerRef) {
      clearTimeout(this.debounceTimerRef);
    }

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
      const { anchors, laneLayers, positions: data, previews } = await fetchSprintPositionsBundle(sprintId);
      if (this.sprintId !== sprintId) return;
      const pending = this.pendingUpdatesRef;
      const draftKeep = snapshotPlanDraftPositions(this.draftTaskIds, this.positions);
      runInAction(() => {
        const next = mergeRemotePositions(data, pending, draftKeep);
        this.positions.clear();
        next.forEach((position, taskId) => {
          this.positions.set(taskId, position);
        });
        replacePlanAnchors(this.planAnchors, anchors);
        replacePlanPatchPreviews(this.planPatchPreviews, previews);
        this.laneLayers.replaceFromServer(laneLayers);
      });
    } catch (error) {
      console.error('Error reconciling remote positions:', error);
    }
  }
}
