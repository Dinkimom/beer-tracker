import type { TaskBarProps } from './TaskBar';
import type { useTaskBarBoard } from './useTaskBarBoard';

import { CSS } from '@dnd-kit/utilities';
import omit from 'lodash-es/omit';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { isSwimlaneCommentTask, isSwimlaneDiagramTask, isSwimlaneWidgetTask } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { usePlannerOnboardingChrome } from '@/features/sprint/components/SprintPlanner/onboarding/plannerOnboardingChrome';
import { useSprintCardPresenceLocked } from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import { useStickyNoteVerticalResize } from '@/features/task/hooks/useStickyNoteVerticalResize';
import { useTaskBarResize } from '@/features/task/hooks/useTaskBarResize';
import { isSwimlaneImageTask } from '@/features/task/utils/swimlaneImageTask';
import { isEffectivelyQaTask } from '@/features/task/utils/taskUtils';
import { plannerCommentCardRowHeightFromDurationParts } from '@/lib/comments/plannerCommentCardRow';
import { useRootStore } from '@/lib/layers';
import { sprintCardPresenceBlocksNewGestures } from '@/lib/realtime/sprintCardPresence';

import { useTaskBarDragBind } from './TaskBarDragBridge';
import {
  buildTaskBarLayoutStyle,
  buildTaskBarWidthCss,
  resolveHasQaTaskInSwimlane,
  resolveTaskBarContentLayout,
  resolveTaskBarDisplayDimensions,
  resolveTaskBarDragActivationProps,
  resolveTaskBarEffectiveOpacity,
  resolveTaskBarInstantGeometryClass,
  resolveTaskBarOnboardingDataset,
  resolveTaskBarLongHoverExpand,
  resolveTaskBarZIndex,
} from './taskBarHelpers';

function publishTaskBarResizePreview(
  sprintPlannerUi: {
    clearStickyNoteCardRowPreview: () => void;
    clearTaskResizePreview: () => void;
    discardLocalTaskResizePreview: () => void;
    setStickyNoteCardRowPreview: (preview: {
      layerShiftUp: number;
      span: number;
      taskId: string;
    } | null) => void;
    setTaskResizePreview: (preview: {
      duration: number;
      planSegmentIndex?: number;
      startCell: number | null;
      taskId: string;
    } | null) => void;
  },
  taskId: string,
  pairsHeightWithDuration: boolean,
  preview: { duration: number; startCell: number | null } | null,
  discardLatch: boolean,
  planSegmentIndex?: number
): void {
  if (preview == null) {
    if (discardLatch) {
      sprintPlannerUi.discardLocalTaskResizePreview();
    } else {
      sprintPlannerUi.clearTaskResizePreview();
    }
    if (pairsHeightWithDuration) {
      sprintPlannerUi.clearStickyNoteCardRowPreview();
    }
    return;
  }
  sprintPlannerUi.setTaskResizePreview({
    ...preview,
    taskId,
    ...(planSegmentIndex != null ? { planSegmentIndex } : {}),
  });
  if (pairsHeightWithDuration) {
    sprintPlannerUi.setStickyNoteCardRowPreview({
      layerShiftUp: 0,
      span: plannerCommentCardRowHeightFromDurationParts(preview.duration),
      taskId,
    });
  }
}

/** Длительность `transition: width` у `.task-bar-item` (app/globals.css). */
const TASK_BAR_WIDTH_TRANSITION_MS = 250;

/**
 * Карточка, раскрытая по long-hover, остаётся поверх соседей, пока сжимается обратно:
 * иначе z-index падает сразу, и на время анимации ширины она уезжает под соседнюю карточку.
 */
function useLongHoverElevation(shouldExpandByLongHover: boolean): boolean {
  const [wasExpanded, setWasExpanded] = useState(shouldExpandByLongHover);
  const [isCollapsing, setIsCollapsing] = useState(false);
  if (wasExpanded !== shouldExpandByLongHover) {
    setWasExpanded(shouldExpandByLongHover);
    setIsCollapsing(!shouldExpandByLongHover);
  }
  useEffect(() => {
    if (!isCollapsing) return;
    const timeoutId = setTimeout(() => setIsCollapsing(false), TASK_BAR_WIDTH_TRANSITION_MS);
    return () => clearTimeout(timeoutId);
  }, [isCollapsing]);
  return shouldExpandByLongHover || isCollapsing;
}

export function useTaskBarDisplayState({
  bar,
  board,
  dimmedByContextMenu,
  longHover,
  resizeDisabled,
}: {
  /** Пропсы карточки как есть: задача, геометрия, ресайз, редактор, меню быстрого добавления. */
  bar: Pick<
    TaskBarProps,
    | 'duration'
    | 'inlineTitleEditor'
    | 'interaction'
    | 'leftPercent'
    | 'onResize'
    | 'planningError'
    | 'quickAdd'
    | 'segment'
    | 'stickyNoteCardRowResize'
    | 'style'
    | 'swimlaneDragActive'
    | 'task'
    | 'taskPositions'
    | 'widthPercent'
  >;
  board: Pick<ReturnType<typeof useTaskBarBoard>, 'globalNameFilter' | 'qaTasksMap' | 'swimlaneTimelineTotalParts'>;
  dimmedByContextMenu: boolean;
  /** Долгое наведение: раскрыта ли карточка и до какой длины её дотянуть. */
  longHover: { expanded: boolean; fitDurationParts: number | null };
  resizeDisabled: boolean;
}) {
  const {
    duration,
    inlineTitleEditor,
    leftPercent,
    onResize,
    stickyNoteCardRowResize,
    style: customStyle,
    swimlaneDragActive,
    task,
    taskPositions,
    widthPercent,
  } = bar;
  const { globalNameFilter, qaTasksMap, swimlaneTimelineTotalParts } = board;
  const planSegmentIndex = bar.segment?.index;
  // Режим связей запрещает перетаскивание и ресайз, но клики оставляет.
  const isLinking = bar.interaction?.linking ?? false;
  const interactionDisabled = (bar.interaction?.disabled ?? false) || isLinking;
  const isInError = bar.planningError != null;
  const quickAddMenu = bar.quickAdd?.menu;

  const { sprintPlannerUi } = useRootStore();
  const onboardingDemo = usePlannerOnboardingChrome();
  const taskId = task.id;
  const presenceLocked = useSprintCardPresenceLocked(taskId);
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
  } = useTaskBarDragBind();
  const isStickyNoteCard = isSwimlaneCommentTask(task);
  const isSwimlanePhotoCard = isSwimlaneImageTask(task);
  const isPhotoOrDiagramCard = isSwimlanePhotoCard || isSwimlaneDiagramTask(task);
  const handleResizeSessionChange = useCallback(
    (active: boolean) => {
      sprintPlannerUi.setResizingTaskId(active ? taskId : null);
    },
    [sprintPlannerUi, taskId]
  );
  const pairsHeightWithDuration = isSwimlaneDiagramTask(task);
  const handleResizePreview = useCallback(
    (
      preview: { duration: number; startCell: number | null } | null,
      options?: { discard?: boolean }
    ) => {
      publishTaskBarResizePreview(
        sprintPlannerUi,
        taskId,
        pairsHeightWithDuration,
        preview,
        options?.discard ?? false,
        planSegmentIndex
      );
    },
    [planSegmentIndex, pairsHeightWithDuration, sprintPlannerUi, taskId]
  );
  const resize = useTaskBarResize({
    duration: duration,
    onResize: onResize,
    onResizePreview: handleResizePreview,
    onResizeSessionChange: handleResizeSessionChange,
    timelineTotalCells: swimlaneTimelineTotalParts,
  });
  const supportsCardRowVerticalResize =
    (isStickyNoteCard || isSwimlanePhotoCard) && stickyNoteCardRowResize != null;
  const verticalResize = useStickyNoteVerticalResize({
    assignedTaskLayer: stickyNoteCardRowResize?.assignedTaskLayer ?? 0,
    committedCardRowLayout: stickyNoteCardRowResize?.committedCardRowLayout,
    enabled:
      supportsCardRowVerticalResize &&
      !resizeDisabled,
    hasTaskOverlaps: stickyNoteCardRowResize?.hasTaskOverlaps ?? false,
    layerHeight: stickyNoteCardRowResize?.layerHeight ?? 1,
    onResizeSessionChange: handleResizeSessionChange,
    onLayoutCommit: stickyNoteCardRowResize?.onLayoutCommit,
    taskBandTotalHeight: stickyNoteCardRowResize?.taskBandTotalHeight ?? 1,
    taskId,
  });
  const isAnyResizing = resize.isResizing || verticalResize.isResizing;

  useEffect(() => {
    return () => {
      if (sprintPlannerUi.resizingTaskId === taskId) {
        sprintPlannerUi.setResizingTaskId(null);
      }
    };
  }, [sprintPlannerUi, taskId]);

  const effectiveIsDragging =
    swimlaneDragActive === undefined ? isDragging : isDragging && swimlaneDragActive;

  const dragActivationProps = useMemo(
    () =>
      resolveTaskBarDragActivationProps({
        attributes,
        inlineTitleEditor: inlineTitleEditor,
        interactionDisabled:
          interactionDisabled ||
          sprintCardPresenceBlocksNewGestures(presenceLocked, isDragging),
        isResizing: isAnyResizing,
        listeners,
      }),
    [attributes, inlineTitleEditor, interactionDisabled, isAnyResizing, isDragging, listeners, presenceLocked]
  );

  const usesPlannerDragOverlay = swimlaneDragActive !== undefined;
  const hideSourceForOverlay = usesPlannerDragOverlay && effectiveIsDragging;

  const { displayLeftPercent, displayWidthPercent } = resolveTaskBarDisplayDimensions({
    isResizing: resize.isResizing,
    leftPercent: leftPercent,
    resizePreviewDuration: resize.resizePreviewDuration,
    resizePreviewStartCell: resize.resizePreviewStartCell,
    swimlaneTimelineTotalParts: swimlaneTimelineTotalParts,
    widthPercent: widthPercent,
  });

  const isDraftTask = task.isLocalTask === true;
  const isPhotoCard = isPhotoOrDiagramCard;
  const { expandedMinWidthPercent, isNarrowForLongHoverExpand, shouldExpandByLongHover } =
    resolveTaskBarLongHoverExpand({
      duration: duration,
      effectiveIsDragging,
      hoverExpandFitDurationParts: longHover.fitDurationParts,
      isDraftTask,
      isExpandedByLongHover: longHover.expanded,
      isLinking: isLinking,
      isPhotoCard: isPhotoCard || isSwimlaneWidgetTask(task),
      isResizing: isAnyResizing,
      swimlaneBarDurationParts: duration,
      swimlaneTimelineTotalParts: swimlaneTimelineTotalParts,
    });

  // Пока карточка сжимается, контент остаётся в раскрытой раскладке: текст обрезает сама ширина.
  const longHoverElevated = useLongHoverElevation(shouldExpandByLongHover);

  const { baseWidthCss, expandedWidthCss } = buildTaskBarWidthCss(
    displayWidthPercent,
    expandedMinWidthPercent
  );
    const { contentDurationParts, contentWidthPercent } = resolveTaskBarContentLayout({
    displayWidthPercent,
    durationParts: duration,
    expandedMinWidthPercent,
    shouldExpandByLongHover: longHoverElevated,
  });

  const customStyleLayout = omit(customStyle ?? {}, ['opacity', 'transition']);
  const layoutStyle = buildTaskBarLayoutStyle({
    baseWidthCss,
    customStyleLayout,
    displayLeftPercent,
    expandedWidthCss,
    hideSourceForOverlay,
    shouldExpandByLongHover,
    transformCss: hideSourceForOverlay ? undefined : CSS.Translate.toString(transform),
  });

  const isQATask = isEffectivelyQaTask(task);
  const hasQATaskInSwimlane = resolveHasQaTaskInSwimlane({
    isQATask,
    qaTasksMap: qaTasksMap,
    task: task,
    taskPositions: taskPositions,
  });

  const effectiveOpacity = resolveTaskBarEffectiveOpacity({
    customStyleOpacity:
      typeof customStyle?.opacity === 'number' ? customStyle.opacity : undefined,
    dimmedByContextMenu: dimmedByContextMenu,
    globalNameFilter: globalNameFilter,
    task: task,
  });

  const taskBarZIndex = resolveTaskBarZIndex({
    effectiveIsDragging,
    hideSourceForOverlay,
    inlineTitleEditor: inlineTitleEditor,
    isInError: isInError,
    isPhotoCard,
    isStickyNote: isSwimlaneCommentTask(task),
    quickAddMenu: quickAddMenu,
    shouldExpandByLongHover: longHoverElevated,
  });

  const instantGeometryClass = resolveTaskBarInstantGeometryClass({
    hideSourceForOverlay,
    isResizing: isAnyResizing,
  });

  return {
    /** Ширина и длина содержимого (с учётом раскрытия по долгому наведению). */
    content: { durationParts: contentDurationParts, widthPercent: contentWidthPercent },
    /** Корневой элемент карточки: мгновенная геометрия, раскладка, слой, разметка онбординга. */
    root: {
      geometryClass: instantGeometryClass,
      layoutStyle,
      onboardingDataset: resolveTaskBarOnboardingDataset(
        taskId,
        onboardingDemo.showResizeHandle,
        onboardingDemo.sampleDragging,
        onboardingDemo.sampleAssigneeShift
      ),
      zIndex: taskBarZIndex,
    },
    dragActivationProps,
    effectiveIsDragging,
    effectiveOpacity,
    hasQATaskInSwimlane,
    hideSourceForOverlay,
    isAnyResizing,
    isDraftTask,
    isNarrowForLongHoverExpand,
    isQATask,
    longHoverElevated,
    presenceLocked,
    resize,
    setNodeRef,
    shouldExpandByLongHover,
    transform,
    verticalResize,
  };
}
