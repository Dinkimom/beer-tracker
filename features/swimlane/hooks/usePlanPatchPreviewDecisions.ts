'use client';

import type { PlanPatchPreviewSourcePosition } from '@/lib/sprints/sprintPlanPatchPositionPreview';
import type { TaskPosition } from '@/types';

import { runInAction } from 'mobx';
import { useCallback } from 'react';

import {
  approvePlanPatchPositionPreview,
  movePlanPatchPositionPreview as saveMovedPlanPatchPositionPreview,
  rejectPlanPatchPositionPreview,
} from '@/lib/api/planPatchPreviews';
import { useRootStore } from '@/lib/layers';
import { movePlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';

import {
  acceptPlanPatchPreviewsLocally,
  restorePlanPatchPreviewsLocally,
} from '../utils/planPatchPreviewLocalDecision';

function sourcePositionOnBoard(
  position: TaskPosition | undefined
): PlanPatchPreviewSourcePosition | undefined {
  if (!position) {
    return undefined;
  }
  return {
    assigneeId: position.assignee,
    duration: position.duration,
    ...(position.segments ? { segments: position.segments } : {}),
    startDay: position.startDay,
    startPart: position.startPart,
    taskId: position.taskId,
  };
}

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

  /** Карточку предложения перетащили: новое место остаётся предложением до approve. */
  const move = useCallback(
    async (taskId: string, position: TaskPosition) => {
      const preview = taskPositions.planPatchPreviews.get(taskId);
      if (!sprintId || !preview) {
        return;
      }
      const moved = movePlanPatchPositionPreview({
        current: sourcePositionOnBoard(taskPositions.positions.get(taskId)),
        next: {
          assigneeId: position.assignee,
          duration: position.duration,
          ...(position.segments ? { segments: position.segments } : {}),
          startDay: position.startDay,
          startPart: position.startPart,
        },
        preview,
      });
      if (!moved) {
        await reject([taskId]);
        return;
      }
      runInAction(() => {
        taskPositions.planPatchPreviews.set(taskId, moved);
      });
      const ok = await saveMovedPlanPatchPositionPreview(sprintId, moved);
      if (!ok) {
        runInAction(() => {
          if (taskPositions.planPatchPreviews.get(taskId) === moved) {
            taskPositions.planPatchPreviews.set(taskId, preview);
          }
        });
      }
    },
    [reject, sprintId, taskPositions]
  );

  return { approve, move, reject };
}
