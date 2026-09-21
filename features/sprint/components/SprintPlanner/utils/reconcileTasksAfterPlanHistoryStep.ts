/**
 * После undo/redo позиций в планере приводим задачи и трекер к актуальной фазе:
 * длина фазы → SP/TP локально; при syncEstimates — PATCH в трекер.
 * Исполнители строки свимлейна → поля задачи (позиция — источник правды для раскладки).
 */

import type { PlanHistoryAppliedPayload } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Developer, Task } from '@/types';
import type { Dispatch, SetStateAction } from 'react';

import {
  applyTaskRowPatches,
  buildPatchesFromPlanHistorySaves,
  syncTrackerEstimatesAfterPlanHistory,
} from './reconcileTasksAfterPlanHistoryStepHelpers';

export function reconcileTasksAfterPlanHistoryStep(
  payload: PlanHistoryAppliedPayload,
  ctx: {
    developers: Developer[];
    syncEstimates: boolean;
    tasksMap: Map<string, Task>;
  },
  setTasks: Dispatch<SetStateAction<Task[]>>
): void {
  const { saves } = payload;
  if (saves.length === 0) {
    return;
  }

  const { patches, trackerByIssueKey } = buildPatchesFromPlanHistorySaves(saves, ctx);

  if (ctx.syncEstimates) {
    syncTrackerEstimatesAfterPlanHistory(trackerByIssueKey);
  }

  applyTaskRowPatches(patches, setTasks);
}
