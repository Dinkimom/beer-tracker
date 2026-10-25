'use client';

import type { PlacedSwimlaneLayerItem } from '@/features/swimlane/utils/layerUtils';
import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { SwimlaneBaselineLayoutMode } from '@/lib/swimlane/swimlaneBaselineLayoutMode';
import type { Task, TaskPosition } from '@/types';
import type { CSSProperties } from 'react';

import { useMemo } from 'react';

import { ZIndex } from '@/constants';
import { useStickyNoteTilt } from '@/features/comments/hooks/useStickyNoteTilt';
import {
  getStickyNoteDashedGhostStyle,
  getStickyNotePaint,
} from '@/features/comments/utils/stickyNotePalette';
import { isSwimlaneCommentTask } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { resolveSwimlaneDropPreviewTarget } from '@/features/swimlane/components/swimlaneHelpers';
import { useSwimlaneLaneHoveredCell } from '@/features/swimlane/hooks/useSwimlaneDragHover';
import { clampSwimlaneQuickAddBandBox } from '@/features/swimlane/utils/swimlaneCellOccupancy';
import {
  buildSwimlaneDropPreviewLaneModel,
  resolveSwimlaneDropPreviewSlot,
} from '@/features/swimlane/utils/swimlaneDropPreview';
import {
  computeSwimlaneRowBandBox,
  SWIMLANE_STACKED_LAYER_GAP_PX,
  SWIMLANE_TASK_ROW_VERTICAL_INSET_PX,
} from '@/features/swimlane/utils/taskLayerTaskLayout';
import { buildSwimlaneTaskBarHorizontalStyle } from '@/features/task/components/TaskBar/taskBarHelpers';
import { getSwimlaneCardRadiusClass } from '@/features/task/components/TaskCard/taskCardLayoutHelpers';
import { getDiagramCardDashedGhostStyle } from '@/features/task/utils/diagramCardSurface';
import { getPhotoCardDashedGhostStyle } from '@/features/task/utils/photoCardSurface';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import { resolvePlannerCardKind } from '@/lib/planner/plannerCardKind';
import { getStatusColors, resolvePaletteStatusKey } from '@/utils/statusColors';

const NEW_LAYER_LINE_PX = 3;

interface SwimlaneDropPreviewProps {
  activeDraggableId: string | null;
  activeTask: Task | null;
  activeTaskDuration: number | null;
  /** Геометрия слоёв, как у превью «+». */
  band: { hasTaskOverlaps: boolean; layerHeight: number };
  developerId: string;
  dropDisabled: boolean;
  isDraggingTask: boolean;
  layout: {
    autoArrange: boolean;
    baselineLayoutMode: SwimlaneBaselineLayoutMode;
    currentCell: number;
    placedLayerItems: readonly PlacedSwimlaneLayerItem[];
    positionedTasks: Array<{ position: TaskPosition; task: Task }>;
    stickyNoteCardRowById: ReadonlyMap<string, StickyNoteCardRowLayout>;
    taskBandVisualHeight: number;
    totalHeight: number;
  };
  taskPositions: Map<string, TaskPosition>;
  timelineTotalParts: number;
}

/** Виджет на доске рисуется фотокарточкой — и призрак у него такой же. */
function resolveAnnotationPaint(task: Task, isDark: boolean): CSSProperties | null {
  switch (resolvePlannerCardKind(task)) {
    case 'image':
    case 'widget':
      return getPhotoCardDashedGhostStyle(isDark);
    case 'diagram':
      return getDiagramCardDashedGhostStyle(isDark);
    case 'note':
      return getStickyNoteDashedGhostStyle(task.stickyNoteColor, isDark);
    default:
      return null;
  }
}

/** Черта вставки — посередине зазора над слоем, куда встанет карточка. */
function resolveInsertLineTop(slotTop: number, layer: number): number {
  const gap = layer === 0 ? SWIMLANE_TASK_ROW_VERTICAL_INSET_PX : SWIMLANE_STACKED_LAYER_GAP_PX;
  return Math.max(0, slotTop - (gap + NEW_LAYER_LINE_PX) / 2);
}

/** Линия тонкая: бумага заметки на ней теряется, поэтому берём насыщенный swatch. */
function resolveAnnotationLineColor(
  task: Task,
  annotationPaint: CSSProperties | null,
  isDark: boolean
): string | undefined {
  if (isSwimlaneCommentTask(task)) {
    return getStickyNotePaint(task.stickyNoteColor, isDark).swatch;
  }
  return annotationPaint?.borderColor;
}

/**
 * Слот карточки там, где она окажется после drop. Черта — если нужен новый слой у нижнего края
 * строки или карточка встанет, только сдвинув соседей вниз (между слоями).
 * Единственный подписчик hover-ячейки в строке: курсор перерисовывает только этот узел, не Swimlane.
 */
export function SwimlaneDropPreview({
  activeDraggableId,
  activeTask,
  activeTaskDuration,
  band,
  developerId,
  dropDisabled,
  isDraggingTask,
  layout,
  taskPositions,
  timelineTotalParts,
}: SwimlaneDropPreviewProps) {
  const isDark = useDocumentDarkClass();
  const tiltRef = useStickyNoteTilt(
    activeTask != null && isSwimlaneCommentTask(activeTask),
    activeTask?.id ?? ''
  );
  const {
    autoArrange,
    baselineLayoutMode,
    currentCell,
    placedLayerItems,
    positionedTasks: laneTasks,
    stickyNoteCardRowById,
    taskBandVisualHeight: taskAreaHeight,
    totalHeight: clipHeight,
  } = layout;
  const hoveredCell = useSwimlaneLaneHoveredCell(
    developerId,
    isDraggingTask && !dropDisabled && activeTask != null
  );
  const activeTaskId = activeTask?.id ?? null;
  const hasHover = hoveredCell != null;
  const lane = useMemo(
    () =>
      hasHover && activeTaskId != null
        ? buildSwimlaneDropPreviewLaneModel({
            activeTaskId,
            autoArrange,
            baselineLayoutMode,
            currentCell,
            laneTasks,
            placed: placedLayerItems,
            stickyNoteCardRowById,
          })
        : null,
    [activeTaskId, autoArrange, baselineLayoutMode, currentCell, hasHover, laneTasks, placedLayerItems, stickyNoteCardRowById]
  );
  const slot = useMemo(() => {
    const target = resolveSwimlaneDropPreviewTarget({
      activeDraggableId,
      activeTask,
      activeTaskDuration,
      developerId,
      dropDisabled,
      hoveredCell,
      isDraggingTask,
    });
    if (!target || !lane) {
      return null;
    }
    return resolveSwimlaneDropPreviewSlot({
      lane,
      target,
      taskPositions,
      totalCells: timelineTotalParts,
    });
  }, [
    activeDraggableId,
    activeTask,
    activeTaskDuration,
    developerId,
    dropDisabled,
    hoveredCell,
    isDraggingTask,
    lane,
    taskPositions,
    timelineTotalParts,
  ]);

  if (!slot || !activeTask) {
    return null;
  }

  const horizontal = buildSwimlaneTaskBarHorizontalStyle({
    durationCells: slot.durationCells,
    startCell: slot.startCell,
    timelineTotalParts,
  });
  const box = clampSwimlaneQuickAddBandBox(
    computeSwimlaneRowBandBox(
      band.hasTaskOverlaps,
      slot.layer,
      taskAreaHeight,
      band.layerHeight,
      slot.span
    ),
    clipHeight
  );
  const colors = getStatusColors(
    resolvePaletteStatusKey(activeTask.originalStatus, activeTask.statusColorKey)
  );
  const annotationPaint = resolveAnnotationPaint(activeTask, isDark);

  // Черта вместо слота: новый слой под строкой или вставка с раздвиганием соседей.
  const lineTop = !box
    ? clipHeight - (SWIMLANE_TASK_ROW_VERTICAL_INSET_PX + NEW_LAYER_LINE_PX) / 2
    : slot.pushesCards
      ? resolveInsertLineTop(Number.parseFloat(box.top), slot.layer)
      : null;
  if (lineTop != null) {
    const lineColor = resolveAnnotationLineColor(activeTask, annotationPaint, isDark);
    return (
      <div
        aria-hidden
        className={`swimlane-quick-add-preview-fade pointer-events-none absolute h-0 ${lineColor ? '' : colors.previewBorder}`}
        data-swimlane-drop-preview={box ? 'insert' : 'new-layer'}
        style={{
          ...horizontal,
          borderTopColor: lineColor,
          borderTopWidth: NEW_LAYER_LINE_PX,
          boxSizing: 'border-box',
          top: lineTop,
          zIndex: ZIndex.stickyElevated,
        }}
      />
    );
  }

  const activeKind = resolvePlannerCardKind(activeTask);
  const radiusClass = getSwimlaneCardRadiusClass(
    activeKind === 'image' || activeKind === 'diagram' || activeKind === 'widget',
    activeKind === 'note'
  );
  const statusPaintClass = annotationPaint
    ? ''
    : `${colors.previewBorder} ${colors.highlight.bg} ${colors.highlightDark?.bg ?? ''}`;
  const notePaperClass = activeKind === 'note' ? 'sticky-note-paper' : '';

  return (
    <div
      ref={tiltRef}
      aria-hidden
      className={`swimlane-quick-add-preview-fade pointer-events-none absolute box-border border-2 border-dashed ${radiusClass} ${statusPaintClass} ${notePaperClass}`}
      data-swimlane-drop-preview="slot"
      style={{
        ...box,
        ...annotationPaint,
        // horizontal после paint — left/width с CARD_MARGIN не перебиваются
        ...horizontal,
        zIndex: ZIndex.stickyElevated,
      }}
    />
  );
}
