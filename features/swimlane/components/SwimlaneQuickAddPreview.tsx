'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { CSSProperties } from 'react';

import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { ExcalidrawMark } from '@/features/comments/components/ExcalidrawMark';
import { getStickyNoteDashedGhostStyle } from '@/features/comments/utils/stickyNotePalette';
import {
  clampSwimlaneQuickAddBandBox,
} from '@/features/swimlane/utils/swimlaneCellOccupancy';
import { computeSwimlaneRowBandBox } from '@/features/swimlane/utils/taskLayerTaskLayout';
import { buildSwimlaneTaskBarHorizontalStyle } from '@/features/task/components/TaskBar/taskBarHelpers';
import { getDiagramCardDashedGhostStyle } from '@/features/task/utils/diagramCardSurface';
import { getPhotoCardDashedGhostStyle } from '@/features/task/utils/photoCardSurface';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';

import {
  resolveSwimlaneQuickAddPreviewClass,
  resolveSwimlaneQuickAddPreviewDurationCells,
  resolveSwimlaneQuickAddPreviewKind,
  resolveSwimlaneQuickAddPreviewLayerSpan,
  type SwimlaneQuickAddPreviewKind,
} from './swimlaneQuickAddPreviewAppearance';

export interface SwimlaneQuickAddHoverPreview {
  cellIndex: number;
  layer: number;
  span: number;
}

interface SwimlaneQuickAddPreviewProps {
  clipHeight: number;
  hasTaskOverlaps: boolean;
  iconName?: string;
  isDiagramTool?: boolean;
  isImageTool?: boolean;
  layerHeight: number;
  noteColor?: StickyNoteColor;
  preview: SwimlaneQuickAddHoverPreview;
  taskAreaHeight: number;
  timelineTotalParts: number;
}

function resolvePreviewGlyph(kind: SwimlaneQuickAddPreviewKind): string {
  if (kind === 'image') {
    return 'image';
  }
  if (kind === 'diagram') {
    return 'diagram';
  }
  return 'plus';
}

function resolvePreviewPaint(
  kind: SwimlaneQuickAddPreviewKind,
  noteColor: StickyNoteColor | undefined,
  isDark: boolean
): CSSProperties | null {
  if (kind === 'note') {
    return getStickyNoteDashedGhostStyle(noteColor, isDark);
  }
  if (kind === 'diagram') {
    return getDiagramCardDashedGhostStyle(isDark);
  }
  if (kind === 'image') {
    return getPhotoCardDashedGhostStyle(isDark);
  }
  return null;
}

/** Превью «+» в слое карточек, чтобы слот совпадал с черновиком после клика. */
export function SwimlaneQuickAddPreview({
  clipHeight,
  hasTaskOverlaps,
  iconName,
  isDiagramTool = false,
  isImageTool = false,
  layerHeight,
  noteColor,
  preview,
  taskAreaHeight,
  timelineTotalParts,
}: SwimlaneQuickAddPreviewProps) {
  const isDark = useDocumentDarkClass();
  const kind = resolveSwimlaneQuickAddPreviewKind({
    isDiagramTool,
    isImageTool,
    isNoteTool: noteColor != null,
  });
  const layerSpan = resolveSwimlaneQuickAddPreviewLayerSpan(kind, preview.span);
  const band = clampSwimlaneQuickAddBandBox(
    computeSwimlaneRowBandBox(
      hasTaskOverlaps,
      preview.layer,
      taskAreaHeight,
      layerHeight,
      layerSpan
    ),
    clipHeight
  );
  if (!band) {
    return null;
  }
  const remainingCells = Math.max(1, timelineTotalParts - preview.cellIndex);
  const horizontal = buildSwimlaneTaskBarHorizontalStyle({
    durationCells: resolveSwimlaneQuickAddPreviewDurationCells(kind, remainingCells),
    startCell: preview.cellIndex,
    timelineTotalParts,
  });
  const glyph = iconName ?? resolvePreviewGlyph(kind);

  return (
    <div
      className={resolveSwimlaneQuickAddPreviewClass(kind)}
      data-swimlane-cell-quick-add-preview
      style={{
        ...band,
        ...horizontal,
        ...resolvePreviewPaint(kind, noteColor, isDark),
        // Ниже карточек: реакции стикера выходят за край и не должны перекрываться превью.
        zIndex: ZIndex.contentOverlay,
      }}
    >
      {kind === 'diagram' ? (
        <ExcalidrawMark className="h-5 w-5" />
      ) : (
        <Icon className="h-5 w-5" name={glyph} />
      )}
    </div>
  );
}
