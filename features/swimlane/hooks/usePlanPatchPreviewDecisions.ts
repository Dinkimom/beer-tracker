'use client';

import { runInAction } from 'mobx';
import { useCallback } from 'react';

import {
  approvePlanPatchPositionPreview,
  rejectPlanPatchPositionPreview,
} from '@/lib/api/planPatchPreviews';
import { useRootStore } from '@/lib/layers';

import {
  acceptPlanPatchPreviewsLocally,
  restorePlanPatchPreviewsLocally,
} from '../utils/planPatchPreviewLocalDecision';

export function usePlanPatchPreviewDecisions(sprintId: number | null | undefined) {
  const { taskPositions } = useRootStore();

  const approve = useCallback(
    async (taskIds?: readonly string[]) => {
      if (!sprintId) {
        return;
      }
      const selected = taskIds
        ? taskIds.flatMap((taskId) => {
            const preview = taskPositions.planPatchPreviews.get(taskId);
            return preview ? [preview] : [];
          })
        : [...taskPositions.planPatchPreviews.values()];
      if (selected.length === 0) {
        return;
      }
      const snapshot = runInAction(() =>
        acceptPlanPatchPreviewsLocally(taskPositions.positions, taskPositions.planPatchPreviews, selected)
      );
      const ok = await approvePlanPatchPositionPreview(
        sprintId,
        selected.length === 1 ? selected[0]?.taskId : undefined
      );
      if (!ok) {
        runInAction(() =>
          restorePlanPatchPreviewsLocally(
            taskPositions.positions,
            taskPositions.planPatchPreviews,
            snapshot
          )
        );
      }
    },
    [sprintId, taskPositions]
  );

  const reject = useCallback(
    async (taskIds?: readonly string[]) => {
      if (!sprintId) {
        return;
      }
      const selected = taskIds
        ? taskIds.flatMap((taskId) => {
            const preview = taskPositions.planPatchPreviews.get(taskId);
            return preview ? [preview] : [];
          })
        : [...taskPositions.planPatchPreviews.values()];
      if (selected.length === 0) {
        return;
      }
      runInAction(() => {
        for (const preview of selected) {
          taskPositions.planPatchPreviews.delete(preview.taskId);
        }
      });
      const ok = await rejectPlanPatchPositionPreview(
        sprintId,
        selected.length === 1 ? selected[0]?.taskId : undefined
      );
      if (!ok) {
        runInAction(() => {
          for (const preview of selected) {
            taskPositions.planPatchPreviews.set(preview.taskId, preview);
          }
        });
      }
    },
    [sprintId, taskPositions]
  );

  return { approve, reject };
}
