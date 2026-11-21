'use client';

import type { ResizeHandleCornerStyle } from './components/taskBarResizeHandleHelpers';
import type { TaskBarOpacityLayerCardProps } from './TaskBarOpacityLayerCard';
import type { TaskBarOpacityLayerChromeProps } from './TaskBarOpacityLayerChrome';
import type { SegmentPlanAnchorOverlay } from '@/features/swimlane/utils/planAnchorShift';

import React, { useCallback, useMemo } from 'react';

import { Icon } from '@/components/Icon';
import { isSwimlaneCommentTask } from '@/features/comments/utils/swimlaneCommentTaskBridge';

import { getQuickAddSubmittingOverlayRadiusClass } from './components/taskBarResizeHandleHelpers';
import { TaskBarDragSourceGhost } from './TaskBarDragSourceGhost';
import { TaskBarOpacityLayerCard } from './TaskBarOpacityLayerCard';
import { TaskBarOpacityLayerChrome } from './TaskBarOpacityLayerChrome';
import {
  buildTaskBarMouseLeaveHandler,
  runTaskBarMouseEnter,
  runTaskBarMouseOut,
  runTaskBarMouseOver,
} from './taskBarOpacityLayerHandlers';
import { TaskBarPlanAnchorOverlay } from './TaskBarPlanAnchorOverlay';
import { useTaskBarResizeSquash } from './useTaskBarResizeSquash';

/** Поля, которые нужны и слою, и карточке, и хрому, — передаются один раз. */
type SharedLayerKey =
  | 'effectiveIsDragging'
  | 'hideSourceForOverlay'
  | 'interactionDisabled'
  | 'isDraftTask'
  | 'isLinking'
  | 'isQATask'
  | 'isSelected'
  | 'resize'
  | 'task';

/** Долгое наведение: состояние живёт в `TaskBar` (от него ширина карточки), обработчики — здесь. */
interface TaskBarLongHover {
  /** Карточка раскрыта: ширина не равна длине, штриховку не рисуем. */
  expanded: boolean;
  isNarrow: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  timelineTotalParts: number;
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setFitDurationParts: (durationParts: number) => void;
}

interface TaskBarOpacityLayerProps
  extends Pick<TaskBarOpacityLayerCardProps, Exclude<SharedLayerKey, 'resize'>> {
  /** Карточка задачи — уходит в `TaskBarOpacityLayerCard` как есть. */
  card: Omit<TaskBarOpacityLayerCardProps, SharedLayerKey | 'cardElementRef'>;
  children?: React.ReactNode;
  /** Ручки ресайза, бейджи, ошибка — уходят в `TaskBarOpacityLayerChrome`. */
  chrome: Omit<TaskBarOpacityLayerChromeProps, SharedLayerKey | 'cornerStyle' | 'planAnchorMoved'>;
  cornerStyle?: ResizeHandleCornerStyle;
  currentDurationParts: number;
  effectiveOpacity: number;
  longHover: TaskBarLongHover;
  /** Штриховка добавленной стоимости и значок переноса относительно плана на старте работы. */
  planAnchorOverlay?: SegmentPlanAnchorOverlay | null;
  quickAddSubmitting: boolean;
  resize: TaskBarOpacityLayerChromeProps['resize'] & { resizeStartDuration: number | null };
  transform: { x: number; y: number; scaleX: number; scaleY: number } | null;
  onTaskHover?: (taskId: string | null) => void;
}

export function TaskBarOpacityLayer(props: TaskBarOpacityLayerProps) {
  const {
    card,
    children,
    chrome,
    cornerStyle = 'rounded',
    currentDurationParts,
    effectiveIsDragging,
    effectiveOpacity,
    hideSourceForOverlay,
    interactionDisabled,
    isDraftTask,
    isLinking = false,
    isQATask,
    isSelected,
    longHover,
    onTaskHover,
    planAnchorOverlay,
    quickAddSubmitting,
    resize,
    task,
    transform,
  } = props;
  const {
    expanded: longHoverExpanded,
    isNarrow: isNarrowForLongHoverExpand,
    setExpanded: setIsExpandedByLongHover,
    setFitDurationParts: setHoverExpandFitDurationParts,
    timelineTotalParts: hoverExpandTimelineTotalParts,
    timeoutRef: longHoverTimeoutRef,
  } = longHover;
  const shared = { effectiveIsDragging, interactionDisabled, isDraftTask, isQATask, isSelected, task };

  const isContextMenuOpenForThis = card.contextMenuTaskId === task.id;
  const cardElementRef = React.useRef<HTMLElement | null>(null);
  const layerRef = React.useRef<HTMLDivElement | null>(null);
  // У заметок упругой деформации нет: бумажка не резиновая.
  const isStickyNote = isSwimlaneCommentTask(task);
  useTaskBarResizeSquash(layerRef, {
    enabled: !isStickyNote,
    resizePreviewDuration: resize.resizePreviewDuration,
    resizeStartDuration: resize.resizeStartDuration,
  });

  const longHoverEnterInput = useMemo(
    () => ({
      cardElementRef,
      currentDurationParts,
      effectiveIsDragging,
      isCommentCard: isStickyNote,
      isDraftTask,
      isLinking,
      isNarrowForLongHoverExpand,
      isResizing: resize.isResizing,
      longHoverTimeoutRef,
      onTaskHover,
      setHoverExpandFitDurationParts,
      setIsExpandedByLongHover,
      taskId: task.id,
      timelineTotalParts: hoverExpandTimelineTotalParts,
    }),
    [
      currentDurationParts,
      effectiveIsDragging,
      hoverExpandTimelineTotalParts,
      isDraftTask,
      isLinking,
      isNarrowForLongHoverExpand,
      isStickyNote,
      longHoverTimeoutRef,
      onTaskHover,
      resize.isResizing,
      setHoverExpandFitDurationParts,
      setIsExpandedByLongHover,
      task.id,
    ]
  );

  const handleMouseEnter = useCallback(
    (event: React.MouseEvent) => {
      runTaskBarMouseEnter({
        ...longHoverEnterInput,
        pointerClient: { x: event.clientX, y: event.clientY },
        pointerTarget: event.target,
      });
    },
    [longHoverEnterInput]
  );

  const handleMouseOver = useCallback(
    (event: React.MouseEvent) => {
      runTaskBarMouseOver({
        eventTarget: event.target,
        longHoverTimeoutRef,
        relatedTarget: event.relatedTarget,
      });
    },
    [longHoverTimeoutRef]
  );

  const handleMouseOut = useCallback(
    (event: React.MouseEvent) => {
      runTaskBarMouseOut({
        ...longHoverEnterInput,
        eventTarget: event.target,
        relatedTarget: event.relatedTarget,
      });
    },
    [longHoverEnterInput]
  );

  const handleMouseLeave = useCallback(
    (e?: { relatedTarget: EventTarget | null }) => {
      buildTaskBarMouseLeaveHandler({
        effectiveIsDragging,
        isContextMenuOpenForThis,
        isResizing: resize.isResizing,
        longHoverTimeoutRef,
        onTaskHover,
        setIsExpandedByLongHover,
        taskId: task.id,
      })(e);
    },
    [
      effectiveIsDragging,
      isContextMenuOpenForThis,
      longHoverTimeoutRef,
      onTaskHover,
      resize.isResizing,
      setIsExpandedByLongHover,
      task.id,
    ]
  );

  return (
    <div
      ref={layerRef}
      className="task-bar-opacity-layer group/taskbar relative h-full min-h-0 w-full min-w-0 overflow-visible"
      style={{
        opacity: hideSourceForOverlay ? 0 : effectiveOpacity,
        transition: hideSourceForOverlay ? 'none' : 'opacity 0.2s ease',
        visibility: hideSourceForOverlay ? 'hidden' : 'visible',
      }}
      onMouseEnter={interactionDisabled ? undefined : handleMouseEnter}
      onMouseLeave={interactionDisabled ? undefined : handleMouseLeave}
      onMouseOut={interactionDisabled ? undefined : handleMouseOut}
      onMouseOver={interactionDisabled ? undefined : handleMouseOver}
    >
      {!hideSourceForOverlay && (
        <TaskBarDragSourceGhost
          cornerStyle={cornerStyle}
          enabled={effectiveIsDragging}
          transform={transform}
        />
      )}
      {quickAddSubmitting ? (
        <div
          aria-busy="true"
          aria-live="polite"
          className={`absolute inset-0 z-[2] flex items-center justify-center ${getQuickAddSubmittingOverlayRadiusClass(cornerStyle)} bg-white/70 dark:bg-gray-900/70`}
        >
          <Icon className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" name="spinner" />
        </div>
      ) : null}
      <TaskBarOpacityLayerCard
        {...card}
        {...shared}
        cardElementRef={cardElementRef}
        hideSourceForOverlay={hideSourceForOverlay}
        isLinking={isLinking}
        resize={resize}
      />
      <TaskBarOpacityLayerChrome
        {...chrome}
        {...shared}
        cornerStyle={cornerStyle}
        planAnchorMoved={planAnchorOverlay?.moved ?? null}
        resize={resize}
      />
      <TaskBarPlanAnchorOverlay
        duration={currentDurationParts}
        hidden={effectiveIsDragging || longHoverExpanded}
        overlay={planAnchorOverlay}
        resizePreviewDuration={resize.resizePreviewDuration}
        resizing={resize.isResizing}
      />
      {children}
    </div>
  );
}
