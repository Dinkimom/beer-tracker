/**
 * Хук для обработки изменения размера задач
 */

import type { TaskPosition } from '@/types';

import { useCallback } from 'react';

import { WORKING_DAYS, PARTS_PER_DAY } from '@/constants';
import { applyTaskResizeToPositions } from '@/features/task/hooks/useTaskResizeHelpers';
import { DELAYS } from '@/utils/constants';

interface UseTaskResizeProps {
  /** Всего ячеек таймлайна свимлейна (рабочие дни × части дня) */
  timelineTotalCells?: number;
  /**
   * Коллбэк после изменения длительности задачи.
   * `updatedPosition` — актуальная позиция после ресайза.
   */
  onAfterResize?: (
    taskId: string,
    newDuration: number,
    updatedPosition: TaskPosition
  ) => void;
  setTaskPositions: (updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>) => void;
  updateXarrow: () => void;
}

export interface TaskResizeParams {
  newDuration: number;
  newStartCell?: number;
  /** Индекс отрезка в getOrderedPlanSegments — при ресайзе карточки с несколькими отрезками */
  planSegmentIndex?: number;
}

/**
 * Хук для обработки изменения размера задачи
 */
export function useTaskResize({
  setTaskPositions,
  updateXarrow,
  onAfterResize,
  timelineTotalCells = WORKING_DAYS * PARTS_PER_DAY,
}: UseTaskResizeProps) {
  const handleTaskResize = useCallback(
    (taskId: string, params: TaskResizeParams) => {
      if (params.newDuration < 1) return;

      let finalDurationForCallback: number | null = null;
      let outgoingPosition: TaskPosition | null = null;

      setTaskPositions((prev) => {
        const result = applyTaskResizeToPositions(prev, taskId, params, timelineTotalCells);
        finalDurationForCallback = result.finalDurationForCallback;
        outgoingPosition = result.outgoingPosition;
        return result.nextPositions;
      });
      setTimeout(() => updateXarrow(), DELAYS.IMMEDIATE);

      if (finalDurationForCallback != null && outgoingPosition != null) {
        onAfterResize?.(taskId, finalDurationForCallback, outgoingPosition);
      }
    },
    [setTaskPositions, updateXarrow, onAfterResize, timelineTotalCells]
  );

  return {
    handleTaskResize,
  };
}
