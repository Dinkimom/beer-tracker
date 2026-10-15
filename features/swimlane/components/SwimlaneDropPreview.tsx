'use client';

import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { SwimlaneBaselineLayoutMode } from '@/lib/swimlane/swimlaneBaselineLayoutMode';
import type { Task, TaskPosition } from '@/types';
import type { CSSProperties } from 'react';

import { useMemo } from 'react';

import { ZIndex } from '@/constants';
import {
  getStickyNoteDashedGhostStyle,
  getStickyNotePaint,
} from '@/features/comments/utils/stickyNotePalette';
import { isSwimlaneCommentTask, isSwimlaneDiagramTask } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { resolveSwimlaneDropPreviewTarget } from '@/features/swimlane/components/swimlaneHelpers';
import { useSwimlaneLaneHoveredCell } from '@/features/swimlane/hooks/useSwimlaneDragHover';
import { clampSwimlaneQuickAddBandBox } from '@/features/swimlane/utils/swimlaneCellOccupancy';
import {
  buildSwimlaneDropPreviewLaneModel,
  resolveSwimlaneDropPreviewSlot,
} from '@/features/swimlane/utils/swimlaneDropPreview';
import {
  computeSwimlaneRowBandBox,
  SWIMLANE_TASK_ROW_VERTICAL_INSET_PX,
} from '@/features/swimlane/utils/taskLayerTaskLayout';
import { buildSwimlaneTaskBarHorizontalStyle } from '@/features/task/components/TaskBar/taskBarHelpers';
import { getSwimlaneCardRadiusClass } from '@/features/task/components/TaskCard/taskCardLayoutHelpers';
import { getDiagramCardDashedGhostStyle } from '@/features/task/utils/diagramCardSurface';
import { getPhotoCardDashedGhostStyle } from '@/features/task/utils/photoCardSurface';
import { isSwimlaneImageTask } from '@/features/task/utils/swimlaneImageTask';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
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
    baselineLayoutMode: SwimlaneBaselineLayoutMode;
    currentCell: number;
    positionedTasks: Array<{ position: TaskPosition; task: Task }>;
    stickyNoteCardRowById: ReadonlyMap<string, StickyNoteCardRowLayout>;
    taskBandVisualHeight: number;
    totalHeight: number;
  };
  taskPositions: Map<string, TaskPosition>;
  timelineTotalParts: number;
}

function resolveAnnotationPaint(task: Task, isDark: boolean): CSSProperties | null {
  if (isSwimlaneImageTask(task)) {
    return getPhotoCardDashedGhostStyle(isDark);
  }
  if (isSwimlaneDiagramTask(task)) {
    return getDiagramCardDashedGhostStyle(isDark);
  }
  if (isSwimlaneCommentTask(task)) {
    return getStickyNoteDashedGhostStyle(task.stickyNoteColor, isDark);
  }
  return null;
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
 * Слот карточки там, где она окажется после drop; если нужен новый слой — линия у нижнего края строки.
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
  const {
    baselineLayoutMode,
    currentCell,
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
            baselineLayoutMode,
            currentCell,
            laneTasks,
            stickyNoteCardRowById,
          })
        : null,
    [activeTaskId, baselineLayoutMode, currentCell, hasHover, laneTasks, stickyNoteCardRowById]
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

  if (!box) {
    const lineColor = resolveAnnotationLineColor(activeTask, annotationPaint, isDark);
    return (
      <div
        aria-hidden
        className={`swimlane-quick-add-preview-fade pointer-events-none absolute h-0 ${lineColor ? '' : colors.previewBorder}`}
        data-swimlane-drop-preview="new-layer"
        style={{
          ...horizontal,
          borderTopColor: lineColor,
          borderTopWidth: NEW_LAYER_LINE_PX,
          boxSizing: 'border-box',
          top: clipHeight - (SWIMLANE_TASK_ROW_VERTICAL_INSET_PX + NEW_LAYER_LINE_PX) / 2,
          zIndex: ZIndex.stickyElevated,
        }}
      />
    );
  }

  const radiusClass = getSwimlaneCardRadiusClass(
    isSwimlaneImageTask(activeTask) || isSwimlaneDiagramTask(activeTask),
    isSwimlaneCommentTask(activeTask)
  );
  const statusPaintClass = annotationPaint
    ? ''
    : `${colors.previewBorder} ${colors.highlight.bg} ${colors.highlightDark?.bg ?? ''}`;

  return (
    <div
      aria-hidden
      className={`swimlane-quick-add-preview-fade pointer-events-none absolute box-border border-2 border-dashed ${radiusClass} ${statusPaintClass}`}
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
