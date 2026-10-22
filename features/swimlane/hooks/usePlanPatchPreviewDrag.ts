'use client';

import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';
import type { TaskPosition } from '@/types';

import { useCallback, useMemo } from 'react';

import { useRootStore } from '@/lib/layers';

import {
  parsePlanPatchPreviewElementId,
  planPatchPreviewElementId,
} from '../utils/planPatchPreviewFocus';

import { usePlanPatchPreviewDecisions } from './usePlanPatchPreviewDecisions';

function dragPositionFromPreview(preview: PlanPatchPositionPreview): TaskPosition {
  return {
    assignee: preview.assigneeId,
    duration: preview.duration,
    ...(preview.segments ? { segments: preview.segments.map((segment) => ({ ...segment })) } : {}),
    startDay: preview.startDay,
    startPart: preview.startPart,
    taskId: planPatchPreviewElementId(preview.taskId),
  };
}

/**
 * Карточки предложений агента в drag-контексте свимлейна. Ключ — id ghost-карточки
 * (`plan-patch-preview-…`), чтобы не путать с реальной позицией той же задачи;
 * сброс такой карточки двигает предложение, а не позицию на доске.
 */
export function usePlanPatchPreviewDrag(params: {
  onPositionDelete: (taskId: string) => void;
  onPositionUpdate: (taskId: string, position: TaskPosition) => void;
  positions: Map<string, TaskPosition>;
  sprintId: number | null | undefined;
}) {
  const { onPositionDelete, onPositionUpdate, positions, sprintId } = params;
  const { taskPositions } = useRootStore();
  const { move } = usePlanPatchPreviewDecisions(sprintId);
  // Хук живёт под observer-планером: чтение карты подписывает рендер, подпись — ключ мемо.
  const movablePreviewsKey = [...taskPositions.planPatchPreviews.values()]
    .filter((preview) => !preview.remove)
    .map((preview) => JSON.stringify(preview))
    .join('\n');

  const dragPositions = useMemo(() => {
    if (movablePreviewsKey === '') {
      return positions;
    }
    const merged = new Map(positions);
    for (const preview of taskPositions.planPatchPreviews.values()) {
      if (!preview.remove) {
        merged.set(planPatchPreviewElementId(preview.taskId), dragPositionFromPreview(preview));
      }
    }
    return merged;
  }, [movablePreviewsKey, positions, taskPositions]);

  const handlePositionUpdate = useCallback(
    (taskId: string, position: TaskPosition) => {
      const previewTaskId = parsePlanPatchPreviewElementId(taskId);
      if (previewTaskId) {
        void move(previewTaskId, position);
        return;
      }
      onPositionUpdate(taskId, position);
    },
    [move, onPositionUpdate]
  );

  const handlePositionDelete = useCallback(
    (taskId: string) => {
      // Сброс предложения в сайдбар ничего не делает: снять его — reject в тулбаре.
      if (parsePlanPatchPreviewElementId(taskId)) {
        return;
      }
      onPositionDelete(taskId);
    },
    [onPositionDelete]
  );

  return { dragPositions, handlePositionDelete, handlePositionUpdate };
}
