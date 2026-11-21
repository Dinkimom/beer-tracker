'use client';

import type { ResizeHandleCornerStyle } from './components/taskBarResizeHandleHelpers';
import type { TaskBarCornerBadgesProps } from './TaskBarCornerBadges';
import type { TaskBarOpacityLayerCardProps } from './TaskBarOpacityLayerCard';
import type { TaskBarResizeHandlesProps } from './TaskBarResizeHandles';

import { observer } from 'mobx-react-lite';
import React, { useCallback, useMemo } from 'react';

import { Icon } from '@/components/Icon';
import { isSwimlaneCommentTask } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { useCardContextMenu } from '@/features/context-menu/hooks/useCardContextMenu';

import { getQuickAddSubmittingOverlayRadiusClass } from './components/taskBarResizeHandleHelpers';
import { TaskBarCornerBadges } from './TaskBarCornerBadges';
import { TaskBarDragSourceGhost } from './TaskBarDragSourceGhost';
import { TaskBarOpacityLayerCard } from './TaskBarOpacityLayerCard';
import {
  buildTaskBarMouseLeaveHandler,
  runTaskBarMouseEnter,
  runTaskBarMouseOut,
  runTaskBarMouseOver,
} from './taskBarOpacityLayerHandlers';
import { TaskBarPlanAnchorOverlay } from './TaskBarPlanAnchorOverlay';
import { TaskBarResizeHandles } from './TaskBarResizeHandles';
import { useTaskBarResizeSquash } from './useTaskBarResizeSquash';

/** Поля, которые нужны и слою, и карточке, и хрому, — передаются один раз. */
type SharedLayerKey =
  | 'effectiveIsDragging'
  | 'hideSourceForOverlay'
  | 'interactionDisabled'
  | 'isDraftTask'
  | 'isLinking'
  | 'isQATask'
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
  /** Значки и кнопки на углах: ошибка планирования, номер отрезка, + QA. */
  badges: Omit<TaskBarCornerBadgesProps, SharedLayerKey>;
  /** Карточка задачи — уходит в `TaskBarOpacityLayerCard` как есть. */
  card: Omit<TaskBarOpacityLayerCardProps, SharedLayerKey | 'cardElementRef'>;
  children?: React.ReactNode;
  cornerStyle?: ResizeHandleCornerStyle;
  currentDurationParts: number;
  effectiveOpacity: number;
  longHover: TaskBarLongHover;
  /** Штриховка добавленной стоимости и значок переноса относительно плана на старте работы. */
  quickAddSubmitting: boolean;
  resize: TaskBarResizeHandlesProps['resize'] & { resizeStartDuration: number | null };
  /** Ручки ресайза: можно ли тянуть и, у заметки и фото, по высоте. */
  resizeHandles: Pick<TaskBarResizeHandlesProps, 'disableResize' | 'showVerticalResize' | 'verticalResize'>;
  transform: { x: number; y: number; scaleX: number; scaleY: number } | null;
  onTaskHover?: (taskId: string | null) => void;
}

// observer: меню карточки читается из стора (`useCardContextMenu`).
export const TaskBarOpacityLayer = observer(function TaskBarOpacityLayer(props: TaskBarOpacityLayerProps) {
  const {
    badges,
    card,
    children,
    cornerStyle = 'rounded',
    currentDurationParts,
    effectiveIsDragging,
    effectiveOpacity,
    hideSourceForOverlay,
    interactionDisabled,
    isDraftTask,
    isLinking = false,
    isQATask,
    longHover,
    onTaskHover,
    quickAddSubmitting,
    resize,
    resizeHandles,
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
  const shared = { effectiveIsDragging, interactionDisabled, isDraftTask, isQATask, task };

  const isContextMenuOpenForThis = useCardContextMenu(task.id).open;
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
      <TaskBarResizeHandles {...resizeHandles} {...shared} cornerStyle={cornerStyle} resize={resize} />
      <TaskBarCornerBadges {...badges} {...shared} />
      <TaskBarPlanAnchorOverlay
        duration={currentDurationParts}
        hidden={effectiveIsDragging || longHoverExpanded}
        resizePreviewDuration={resize.resizePreviewDuration}
        resizing={resize.isResizing}
      />
      {children}
    </div>
  );
});
