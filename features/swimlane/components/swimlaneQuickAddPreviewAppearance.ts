import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { SwimlanePlacementTool } from '@/lib/layers';

import { getPartsPerDay } from '@/constants';

export type SwimlaneQuickAddPreviewKind =
  | 'availability'
  | 'diagram'
  | 'image'
  | 'note'
  | 'task';

interface SwimlaneQuickAddPlacementFootprint {
  durationCells: number;
  /** Карточка (фото/схема): если от ячейки не помещается до конца спринта — «+» нет (T4, не укорачиваем). */
  mustFitSprint?: boolean;
  /** Отсутствие нельзя делить по слотам — превью и хит от начала дня на всю его ширину. */
  snapToDay?: boolean;
  span: number;
}

function isTwoByTwoPreviewKind(kind: SwimlaneQuickAddPreviewKind): boolean {
  return kind === 'diagram' || kind === 'image';
}

const QUICK_ADD_PREVIEW_TASK_CLASS =
  'swimlane-quick-add-preview-fade pointer-events-none absolute flex items-center justify-center rounded-lg border border-dashed border-blue-300 bg-blue-50/70 text-blue-600 dark:border-blue-700 dark:bg-blue-900/25 dark:text-blue-300';

const QUICK_ADD_PREVIEW_NOTE_CLASS =
  'swimlane-quick-add-preview-fade pointer-events-none absolute flex items-center justify-center border border-dashed';

export function resolveSwimlaneQuickAddPreviewKind(input: {
  isAvailabilityTool?: boolean;
  isDiagramTool?: boolean;
  isImageTool: boolean;
  isNoteTool: boolean;
}): SwimlaneQuickAddPreviewKind {
  if (input.isAvailabilityTool) {
    return 'availability';
  }
  if (input.isImageTool) {
    return 'image';
  }
  if (input.isDiagramTool) {
    return 'diagram';
  }
  if (input.isNoteTool) {
    return 'note';
  }
  return 'task';
}

export function resolveSwimlaneQuickAddPreviewToolProps(
  tool: SwimlanePlacementTool,
  stickyNoteColor: StickyNoteColor
): {
  iconName: string;
  isAvailabilityTool?: boolean;
  isDiagramTool?: boolean;
  isImageTool: boolean;
  noteColor?: StickyNoteColor;
} {
  if (tool === 'availability') {
    return { iconName: 'calendar', isAvailabilityTool: true, isImageTool: false };
  }
  if (tool === 'image') {
    return { iconName: 'image', isImageTool: true };
  }
  if (tool === 'diagram') {
    return { iconName: 'diagram', isDiagramTool: true, isImageTool: false };
  }
  if (tool === 'tictactoe') {
    return { iconName: 'tictactoe', isImageTool: true };
  }
  if (tool === 'comment') {
    return { iconName: 'plus', isImageTool: false, noteColor: stickyNoteColor };
  }
  return { iconName: 'plus', isImageTool: false };
}

export function resolveSwimlaneQuickAddPreviewClass(kind: SwimlaneQuickAddPreviewKind): string {
  if (kind === 'task' || kind === 'availability') {
    return QUICK_ADD_PREVIEW_TASK_CLASS;
  }
  if (kind === 'note') {
    return `${QUICK_ADD_PREVIEW_NOTE_CLASS} sticky-note-paper`;
  }
  return QUICK_ADD_PREVIEW_NOTE_CLASS;
}

export function resolveSwimlaneQuickAddPreviewDurationCells(
  kind: SwimlaneQuickAddPreviewKind,
  remainingCells: number
): number {
  if (kind === 'availability') {
    return Math.max(1, Math.min(getPartsPerDay(), remainingCells));
  }
  if (!isTwoByTwoPreviewKind(kind)) {
    return 1;
  }
  return Math.max(1, Math.min(2, remainingCells));
}

export function resolveSwimlaneQuickAddPlacementFootprint(
  tool: SwimlanePlacementTool
): SwimlaneQuickAddPlacementFootprint {
  if (tool === 'image' || tool === 'diagram') {
    return { durationCells: 2, mustFitSprint: true, span: 2 };
  }
  if (tool === 'tictactoe') {
    return { durationCells: 2, span: 2 };
  }
  if (tool === 'availability') {
    return { durationCells: getPartsPerDay(), span: 1, snapToDay: true };
  }
  return { durationCells: 1, span: 1 };
}

/** Если hover «+» выше текущей строки — вырастить полосу, чтобы слот влез. */
export function resolveSwimlaneQuickAddRowGrowLayers(input: {
  hideQuickAddPreview: boolean;
  hoverPreview: { layer: number; span: number } | null;
}): { hoverMinTaskLayers?: number; previewSpanLayers?: number } {
  if (input.hideQuickAddPreview || input.hoverPreview == null) {
    return {};
  }
  const needed = input.hoverPreview.layer + input.hoverPreview.span;
  if (needed <= 1) {
    return {};
  }
  if (input.hoverPreview.layer > 0) {
    return { hoverMinTaskLayers: needed };
  }
  return { previewSpanLayers: needed };
}

export function resolveSwimlaneQuickAddPreviewLayerSpan(
  kind: SwimlaneQuickAddPreviewKind,
  baseSpan: number
): number {
  return isTwoByTwoPreviewKind(kind) ? 2 : baseSpan;
}
