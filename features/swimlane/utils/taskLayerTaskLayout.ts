import type { PhaseSegment, Task, TaskPosition } from '@/types';
import type { CSSProperties } from 'react';

import { getPartsPerDay } from '@/constants';
import { getLeftPercent, getWidthPercent } from '@/features/swimlane/utils/positionUtils';

import {
  baselineOpacityDuringDrag,
  computeSwimlaneOverdueBaselineStripsForSegments,
  resolveFactDimOpacity,
  resolveLinkDimOpacity,
  resolveSegmentEditDimOpacity,
} from './taskLayerTaskLayoutHelpers';

/** Вертикальный inset одиночной строки задач (верх/низ ряда). */
export const SWIMLANE_TASK_ROW_VERTICAL_INSET_PX = 12;
/** Скругление swimlane-карточки (`TaskCard` → `rounded-lg`). */
export const SWIMLANE_TASK_CARD_BORDER_RADIUS_PX = 8;
/** Зазор между слоями при наложении карточек. */
const SWIMLANE_TASK_LAYER_VERTICAL_INSET_PX = 4;
/** Визуальный промежуток между слоями: inset с обеих сторон стыка. */
export const SWIMLANE_STACKED_LAYER_GAP_PX = SWIMLANE_TASK_LAYER_VERTICAL_INSET_PX * 2;

export function resolveSwimlaneStackedTaskBandHeightPx(
  layerCount: number,
  cardHeightPx: number
): number {
  const layers = Math.max(1, layerCount);
  return (
    cardHeightPx * layers +
    SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2 +
    SWIMLANE_STACKED_LAYER_GAP_PX * Math.max(0, layers - 1)
  );
}

interface PlannedLayoutSnapshot {
  plannedDuration: number;
  plannedPosition: {
    endCell: number;
    leftPercent: number;
    startCell: number;
    widthPercent: number;
  };
  plannedStartDay: number;
  plannedStartPart: number;
}

export function buildPlannedLayoutSnapshot(position: TaskPosition): PlannedLayoutSnapshot {
  const plannedStartDay = position.plannedStartDay ?? position.startDay;
  const plannedStartPart = position.plannedStartPart ?? position.startPart;
  const plannedDuration = position.plannedDuration ?? position.duration;

  const plannedPosition = {
    leftPercent: getLeftPercent({
      assignee: position.assignee,
      duration: plannedDuration,
      startDay: plannedStartDay,
      startPart: plannedStartPart,
      taskId: position.taskId,
    }),
    widthPercent: getWidthPercent(plannedDuration),
    startCell: plannedStartDay * getPartsPerDay() + plannedStartPart,
    endCell: plannedStartDay * getPartsPerDay() + plannedStartPart + plannedDuration,
  };

  return { plannedDuration, plannedPosition, plannedStartDay, plannedStartPart };
}

export function computeBaselineStretch(
  task: Task,
  plannedEndCell: number,
  currentCell: number
): { baselineStart: number; baselineWidth: number } | null {
  if (task.status !== 'in-progress' && task.status !== 'todo') return null;
  if (plannedEndCell >= currentCell) return null;
  return {
    baselineStart: plannedEndCell,
    baselineWidth: currentCell - plannedEndCell,
  };
}

/**
 * Полосы просрочки в свимлейне: от конца последнего отрезка плана до currentCell (только при отставании).
 * При нескольких сегментах не считать baseline от промежуточных отрезков.
 */
export function computeSwimlaneOverdueBaselineStrips(
  task: Task,
  planSegments: PhaseSegment[],
  currentCell: number
): Array<{ baselineStart: number; baselineWidth: number }> {
  return computeSwimlaneOverdueBaselineStripsForSegments(
    task,
    planSegments,
    currentCell,
    computeBaselineStretch
  );
}

/**
 * Полосы просрочки под превью drag: бит i — strips[i] приглушена.
 * Примитив, чтобы подписчик hover-стора перерисовывался только при смене маски.
 */
export function computeBaselineStripsDragDimMask(params: {
  activeTaskDuration: number | null;
  assigneeId: string;
  hoveredCell: { assigneeId: string; day: number; part: number } | null;
  /** Превью по hoveredCell только во время drag (иначе возможны «залипшие» поля) */
  isDraggingTask: boolean;
  strips: ReadonlyArray<{ baselineStart: number; baselineWidth: number }>;
}): number {
  let mask = 0;
  params.strips.forEach(({ baselineStart, baselineWidth }, idx) => {
    const dragOpacity = baselineOpacityDuringDrag({
      activeTaskDuration: params.activeTaskDuration,
      assigneeId: params.assigneeId,
      baselineStart,
      baselineWidth,
      hoveredCell: params.hoveredCell,
      isDraggingTask: params.isDraggingTask,
    });
    if (dragOpacity != null) {
      mask |= 1 << idx;
    }
  });
  return mask;
}

function resolveSwimlaneRowBandInsetsPx(
  hasTaskOverlaps: boolean,
  taskLayer: number,
  totalHeight: number,
  layerHeight: number,
  layerSpan = 1
): { bottom: number; top: number } {
  if (!hasTaskOverlaps) {
    const inset = SWIMLANE_TASK_ROW_VERTICAL_INSET_PX;
    return { bottom: inset, top: inset };
  }
  const rowInset = SWIMLANE_TASK_ROW_VERTICAL_INSET_PX;
  const gap = SWIMLANE_STACKED_LAYER_GAP_PX;
  const span = Math.max(1, layerSpan);
  const stride = layerHeight + gap;
  const innerHeight = totalHeight - rowInset * 2;
  const layerCount = Math.max(1, Math.round((innerHeight + gap) / stride));
  const layersBelow = Math.max(0, layerCount - taskLayer - span);
  return {
    bottom: rowInset + layersBelow * stride,
    top: rowInset + taskLayer * stride,
  };
}

export function computeSwimlaneRowBandStyle(
  hasTaskOverlaps: boolean,
  taskLayer: number,
  totalHeight: number,
  layerHeight: number
): Pick<CSSProperties, 'bottom' | 'top'> {
  const { bottom, top } = resolveSwimlaneRowBandInsetsPx(
    hasTaskOverlaps,
    taskLayer,
    totalHeight,
    layerHeight
  );
  return { bottom: `${bottom}px`, top: `${top}px` };
}

function resolveSwimlaneRowBandBoxPx(
  hasTaskOverlaps: boolean,
  taskLayer: number,
  totalHeight: number,
  layerHeight: number,
  layerSpan = 1
): { height: number; top: number } {
  if (!hasTaskOverlaps) {
    const inset = SWIMLANE_TASK_ROW_VERTICAL_INSET_PX;
    const oneCardHeight = totalHeight - inset * 2;
    return {
      top: inset + taskLayer * oneCardHeight,
      height: oneCardHeight * Math.max(1, layerSpan),
    };
  }
  const { top } = resolveSwimlaneRowBandInsetsPx(
    hasTaskOverlaps,
    taskLayer,
    totalHeight,
    layerHeight,
    layerSpan
  );
  const span = Math.max(1, layerSpan);
  const gap = SWIMLANE_STACKED_LAYER_GAP_PX;
  return {
    top,
    height: layerHeight * span + gap * (span - 1),
  };
}

/** Явные top/height — для превью «+» в ячейке, когда высота ячейки ≠ зоне задач. */
export function computeSwimlaneRowBandBox(
  hasTaskOverlaps: boolean,
  taskLayer: number,
  totalHeight: number,
  layerHeight: number,
  layerSpan = 1
): Pick<CSSProperties, 'height' | 'top'> {
  const box = resolveSwimlaneRowBandBoxPx(
    hasTaskOverlaps,
    taskLayer,
    totalHeight,
    layerHeight,
    layerSpan
  );
  return {
    top: `${box.top}px`,
    height: `${box.height}px`,
  };
}

/** Чип «Отстаёт»: text-xs, py-1, рамка 1.5px. */
const OVERDUE_BASELINE_CHIP_HEIGHT_PX = 24;
/** Зазор между стрелкой связи и чипом бейзлайна. */
const OVERDUE_BASELINE_LINK_CLEARANCE_PX = 6;
const TASK_LINK_ARROW_STROKE_PX = 2.5;

/**
 * Сдвиг бейзлайна вниз от центра карточки.
 * Стрелка связи выходит из середины стороны — линия и чип уступают ей этот уровень.
 * Чип может зайти в нижний inset строки, но не дальше него.
 */
export function resolveOverdueBaselineLinkClearanceOffsetPx(baselineHeight: number): number {
  const chipHalf = OVERDUE_BASELINE_CHIP_HEIGHT_PX / 2;
  const desired =
    chipHalf + TASK_LINK_ARROW_STROKE_PX / 2 + OVERDUE_BASELINE_LINK_CLEARANCE_PX;
  const roomBelowCenter =
    baselineHeight / 2 +
    SWIMLANE_TASK_CARD_BORDER_RADIUS_PX +
    SWIMLANE_TASK_ROW_VERTICAL_INSET_PX;
  const maxOffset = Math.max(0, roomBelowCenter - chipHalf);
  return Math.min(Math.round(desired), maxOffset);
}

/** Вертикальный box overdue-baseline — высота карточки минус скругление; без bottom, чтобы не тянуться за строкой. */
export function computeSwimlaneBaselineInsetsPx(
  hasTaskOverlaps: boolean,
  taskLayer: number,
  totalHeight: number,
  layerHeight: number,
  layerSpan = 1
): { height: number; top: number } {
  const card = resolveSwimlaneRowBandBoxPx(
    hasTaskOverlaps,
    taskLayer,
    totalHeight,
    layerHeight,
    layerSpan
  );
  const radiusInset = SWIMLANE_TASK_CARD_BORDER_RADIUS_PX;
  return {
    top: card.top + radiusInset,
    height: Math.max(0, card.height - radiusInset * 2),
  };
}

export function computeTaskLayerCardOpacity(params: {
  activeTask: Task | null;
  factHoveredTaskId: string | null;
  hoverConnectedTaskIds: Set<string> | null;
  onSegmentEditCancel?: () => void;
  onSegmentEditSave?: unknown;
  segmentEditTaskId: string | null;
  taskId: string;
}): number {
  const {
    activeTask,
    factHoveredTaskId,
    hoverConnectedTaskIds,
    onSegmentEditCancel,
    onSegmentEditSave,
    segmentEditTaskId,
    taskId,
  } = params;

  const linkDimOpacity = resolveLinkDimOpacity(hoverConnectedTaskIds, taskId);
  const factDimOpacity = resolveFactDimOpacity(factHoveredTaskId, taskId);
  const segmentEditDimOpacity = resolveSegmentEditDimOpacity({
    onSegmentEditCancel,
    onSegmentEditSave,
    segmentEditTaskId,
    taskId,
  });
  return (
    (activeTask != null ? 1 : Math.min(linkDimOpacity, factDimOpacity)) * segmentEditDimOpacity
  );
}
