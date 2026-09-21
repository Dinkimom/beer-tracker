import type { CSSProperties } from 'react';

import {
  computeSwimlaneRowBandBox,
  SWIMLANE_STACKED_LAYER_GAP_PX,
  SWIMLANE_TASK_ROW_VERTICAL_INSET_PX,
} from '@/features/swimlane/utils/taskLayerTaskLayout';

export interface StickyNoteCardRowLayout {
  layerShiftUp: number;
  span: number;
}

export const DEFAULT_STICKY_NOTE_CARD_ROW_LAYOUT: StickyNoteCardRowLayout = {
  layerShiftUp: 0,
  span: 1,
};

/** Максимум строк карточки при вертикальном ресайзе sticky-note (локальный UI). */
export const MAX_STICKY_NOTE_CARD_ROW_SPAN = 10;

const MIN_STICKY_NOTE_CARD_ROW_SPAN = 1;

function resolveStickyNoteCardRowStridePx(params: {
  hasTaskOverlaps: boolean;
  layerHeight: number;
  taskBandTotalHeight: number;
}): number {
  if (!params.hasTaskOverlaps) {
    return params.taskBandTotalHeight - SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2;
  }
  return params.layerHeight + SWIMLANE_STACKED_LAYER_GAP_PX;
}

export function resolveStickyNoteMaxCardRowIndex(params: {
  hasTaskOverlaps: boolean;
  layerHeight: number;
  startRowIndex?: number;
  taskBandTotalHeight: number;
}): number {
  const maxByCap = MAX_STICKY_NOTE_CARD_ROW_SPAN - 1;
  if (!params.hasTaskOverlaps) {
    // Одна визуальная строка свимлейна, но карточка может расти вниз (как multi-slot фото).
    return maxByCap;
  }
  // Строка растёт вместе с span карточки (preview → layout); не ограничиваем текущей полосой.
  if (params.startRowIndex != null) {
    return Math.min(maxByCap, params.startRowIndex + MAX_STICKY_NOTE_CARD_ROW_SPAN - 1);
  }
  return maxByCap;
}

export function pointerYToStickyNoteCardRowIndex(params: {
  hasTaskOverlaps: boolean;
  layerHeight: number;
  pointerYInRowPx: number;
  startRowIndex?: number;
  taskBandTotalHeight: number;
}): number {
  const inset = SWIMLANE_TASK_ROW_VERTICAL_INSET_PX;
  const stride = resolveStickyNoteCardRowStridePx(params);
  const raw = Math.floor((params.pointerYInRowPx - inset) / stride);
  return Math.max(
    0,
    Math.min(raw, resolveStickyNoteMaxCardRowIndex(params))
  );
}

export function resolveStickyNoteStartCardRow(
  assignedTaskLayer: number,
  layout: StickyNoteCardRowLayout
): number {
  return Math.max(0, assignedTaskLayer - layout.layerShiftUp);
}

function resolveStickyNoteCardRowLayoutFromRows(params: {
  assignedTaskLayer: number;
  bottomRowIndex: number;
  maxRowIndex: number;
  startRowIndex: number;
}): StickyNoteCardRowLayout {
  const startRow = Math.max(0, Math.min(params.startRowIndex, params.bottomRowIndex));
  const bottomRow = Math.max(startRow, Math.min(params.bottomRowIndex, params.maxRowIndex));
  return {
    layerShiftUp: Math.max(0, params.assignedTaskLayer - startRow),
    span: Math.max(MIN_STICKY_NOTE_CARD_ROW_SPAN, bottomRow - startRow + 1),
  };
}

export function resolveStickyNoteCardRowLayoutFromBottomDrag(params: {
  assignedTaskLayer: number;
  bottomRowIndex: number;
  layout: StickyNoteCardRowLayout;
  maxRowIndex: number;
}): StickyNoteCardRowLayout {
  const startRow = resolveStickyNoteStartCardRow(params.assignedTaskLayer, params.layout);
  const bottomRow = Math.max(
    startRow,
    Math.min(params.bottomRowIndex, params.maxRowIndex)
  );
  return {
    layerShiftUp: Math.max(0, params.assignedTaskLayer - startRow),
    span: Math.max(MIN_STICKY_NOTE_CARD_ROW_SPAN, bottomRow - startRow + 1),
  };
}

export function resolveStickyNoteCardRowLayoutFromTopDrag(params: {
  assignedTaskLayer: number;
  anchorBottomRowIndex: number;
  maxRowIndex: number;
  topRowIndex: number;
}): StickyNoteCardRowLayout {
  return resolveStickyNoteCardRowLayoutFromRows({
    assignedTaskLayer: params.assignedTaskLayer,
    bottomRowIndex: params.anchorBottomRowIndex,
    maxRowIndex: params.maxRowIndex,
    startRowIndex: params.topRowIndex,
  });
}

export function resolveStickyNoteEffectiveCardRowLayout(
  override?: StickyNoteCardRowLayout
): StickyNoteCardRowLayout {
  if (!override) {
    return DEFAULT_STICKY_NOTE_CARD_ROW_LAYOUT;
  }
  const span = Math.max(MIN_STICKY_NOTE_CARD_ROW_SPAN, Math.round(override.span));
  const layerShiftUp = Math.max(0, Math.min(span - 1, Math.round(override.layerShiftUp)));
  return { layerShiftUp, span };
}

export function mergeStickyNoteCardRowOverrideMaps(
  base: ReadonlyMap<string, StickyNoteCardRowLayout>,
  overrides: ReadonlyMap<string, StickyNoteCardRowLayout>
): Map<string, StickyNoteCardRowLayout> {
  const merged = new Map(base);
  for (const [taskId, layout] of overrides) {
    merged.set(taskId, layout);
  }
  return merged;
}

export function buildEffectiveStickyNoteCardRowById(input: {
  overrides: ReadonlyMap<string, StickyNoteCardRowLayout>;
  preview: StickyNoteCardRowLayout & { taskId: string } | null;
}): Map<string, StickyNoteCardRowLayout> {
  const map = new Map<string, StickyNoteCardRowLayout>();
  for (const [taskId, layout] of input.overrides) {
    map.set(taskId, resolveStickyNoteEffectiveCardRowLayout(layout));
  }
  if (input.preview) {
    map.set(
      input.preview.taskId,
      resolveStickyNoteEffectiveCardRowLayout({
        layerShiftUp: input.preview.layerShiftUp,
        span: input.preview.span,
      })
    );
  }
  return map;
}

export function resolveStickyNoteSwimlaneRowBandStyle(params: {
  assignedTaskLayer: number;
  cardRowLayout: StickyNoteCardRowLayout;
  defaultBandStyle: Pick<CSSProperties, 'height' | 'top'>;
  hasTaskOverlaps: boolean;
  layerHeight: number;
  taskBandTotalHeight: number;
  usesCardRowBandLayout: boolean;
}): Pick<CSSProperties, 'height' | 'top'> {
  if (!params.usesCardRowBandLayout) {
    return params.defaultBandStyle;
  }
  const layout = resolveStickyNoteEffectiveCardRowLayout(params.cardRowLayout);
  const startLayer = resolveStickyNoteStartCardRow(params.assignedTaskLayer, layout);
  return computeSwimlaneRowBandBox(
    params.hasTaskOverlaps,
    startLayer,
    params.taskBandTotalHeight,
    params.layerHeight,
    layout.span
  );
}
