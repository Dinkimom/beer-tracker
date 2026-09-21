import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { SwimlanePlacementTool } from '@/lib/layers';
import type { CSSProperties } from 'react';

export type SwimlaneQuickAddPreviewKind = 'diagram' | 'image' | 'note' | 'task';

function isTwoByTwoPreviewKind(kind: SwimlaneQuickAddPreviewKind): boolean {
  return kind === 'diagram' || kind === 'image';
}

const QUICK_ADD_PREVIEW_TASK_CLASS =
  'swimlane-quick-add-preview-fade pointer-events-none absolute flex items-center justify-center rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/70 text-blue-600 dark:border-blue-700 dark:bg-blue-900/25 dark:text-blue-300';

const QUICK_ADD_PREVIEW_NOTE_CLASS =
  'swimlane-quick-add-preview-fade pointer-events-none absolute flex items-center justify-center border-2 border-dashed';

export function resolveSwimlaneQuickAddPreviewKind(input: {
  isDiagramTool?: boolean;
  isImageTool: boolean;
  isNoteTool: boolean;
}): SwimlaneQuickAddPreviewKind {
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
  isDiagramTool?: boolean;
  isImageTool: boolean;
  noteColor?: StickyNoteColor;
} {
  if (tool === 'availability') {
    return { iconName: 'calendar', isImageTool: false };
  }
  if (tool === 'image') {
    return { iconName: 'image', isImageTool: true };
  }
  if (tool === 'diagram') {
    return { iconName: 'diagram', isDiagramTool: true, isImageTool: false };
  }
  if (tool === 'comment') {
    return { iconName: 'plus', isImageTool: false, noteColor: stickyNoteColor };
  }
  return { iconName: 'plus', isImageTool: false };
}

export function resolveSwimlaneQuickAddPreviewClass(
  kind: SwimlaneQuickAddPreviewKind
): string {
  return kind === 'task' ? QUICK_ADD_PREVIEW_TASK_CLASS : QUICK_ADD_PREVIEW_NOTE_CLASS;
}

export function resolveSwimlaneQuickAddPreviewDurationCells(
  kind: SwimlaneQuickAddPreviewKind,
  remainingCells: number
): number {
  if (!isTwoByTwoPreviewKind(kind)) {
    return 1;
  }
  return Math.max(1, Math.min(2, remainingCells));
}

export function resolveSwimlaneQuickAddPlacementFootprint(isImageTool: boolean): {
  durationCells: number;
  span: number;
} {
  if (isImageTool) {
    return { durationCells: 2, span: 2 };
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

export function resolveSwimlaneQuickAddPreviewLayout(input: {
  band: Pick<CSSProperties, 'height' | 'top'>;
  horizontal: Pick<CSSProperties, 'left' | 'width'>;
  kind: SwimlaneQuickAddPreviewKind;
}): CSSProperties {
  if (input.kind === 'note') {
    return {
      height: input.band.height,
      left: input.horizontal.left,
      maxWidth: input.horizontal.width,
      top: input.band.top,
      width: input.band.height,
    };
  }
  return { ...input.band, ...input.horizontal };
}
