'use client';

import type { ResizeHandleCornerStyle } from './components/taskBarResizeHandleHelpers';
import type { Task } from '@/types';

import React from 'react';

import { TaskBarResizeHandle } from './components/TaskBarResizeHandle';
import { TaskBarCornerBadges } from './TaskBarCornerBadges';

interface TaskBarOpacityLayerChromeProps {
  cornerStyle?: ResizeHandleCornerStyle;
  disableResize: boolean;
  effectiveIsDragging: boolean;
  errorTooltip?: string;
  hasQATaskInSwimlane: boolean;
  interactionDisabled: boolean;
  isDraftTask: boolean;
  isInError: boolean;
  isQATask: boolean;
  isSelected: boolean;
  /** Значок переноса относительно плана на старте — в одном ряду с номером сегмента. */
  planAnchorMoved?: 'earlier' | 'later' | null;
  resize: {
    handleResizeStart: (e: React.MouseEvent, side: 'left' | 'right') => void;
    isResizing: boolean;
    resizePreviewDuration: number | null;
    resizeSide: 'left' | 'right' | null;
  };
  showVerticalResize?: boolean;
  swimlaneSegmentBadge?: { index: number; total: number } | null;
  swimlaneSegmentSecondary: boolean;
  task: Task;
  verticalResize?: {
    /** Раскладка заметки в строках (span меняется по шагам жеста). */
    cardRowLayout?: { span: number };
    handleResizeStart: (e: React.MouseEvent, side: 'bottom' | 'top') => void;
    isResizing: boolean;
    resizeSide: 'bottom' | 'top' | null;
  };
  onCreateQATask?: (taskId: string, anchorRect?: DOMRect) => void;
}

export function TaskBarOpacityLayerChrome({
  cornerStyle = 'rounded',
  disableResize,
  effectiveIsDragging,
  errorTooltip,
  hasQATaskInSwimlane,
  interactionDisabled,
  isDraftTask,
  isInError,
  isQATask,
  isSelected,
  onCreateQATask,
  planAnchorMoved = null,
  resize,
  showVerticalResize = false,
  swimlaneSegmentBadge,
  swimlaneSegmentSecondary,
  task,
  verticalResize,
}: TaskBarOpacityLayerChromeProps) {
  const showResizeHandles = !isSelected && !disableResize && !interactionDisabled;

  return (
    <>

      {showResizeHandles ? (
        <div
          className={`task-bar-resize-handle-chrome${
            cornerStyle === 'square' ? ' task-bar-resize-handle-chrome--tilted' : ''
          }`}
        >
          <TaskBarResizeHandle
            cornerStyle={cornerStyle}
            isDraftTask={isDraftTask}
            isQATask={isQATask}
            isResizing={resize.isResizing}
            originalStatus={task.originalStatus}
            resizeSide={resize.resizeSide}
            resizeStep={resize.resizePreviewDuration}
            side="right"
            statusColorKey={task.statusColorKey}
            stickyNoteColor={cornerStyle === 'square' ? task.stickyNoteColor : undefined}
            onMouseDown={(e) => resize.handleResizeStart(e, 'right')}
          />
          <TaskBarResizeHandle
            cornerStyle={cornerStyle}
            isDraftTask={isDraftTask}
            isQATask={isQATask}
            isResizing={resize.isResizing}
            originalStatus={task.originalStatus}
            resizeSide={resize.resizeSide}
            resizeStep={resize.resizePreviewDuration}
            side="left"
            statusColorKey={task.statusColorKey}
            stickyNoteColor={cornerStyle === 'square' ? task.stickyNoteColor : undefined}
            onMouseDown={(e) => resize.handleResizeStart(e, 'left')}
          />

          {showVerticalResize && verticalResize ? (
            <TaskBarResizeHandle
              cornerStyle={cornerStyle}
              isDraftTask={isDraftTask}
              isQATask={isQATask}
              isResizing={verticalResize.isResizing}
              originalStatus={task.originalStatus}
              resizeSide={verticalResize.resizeSide}
              resizeStep={verticalResize.isResizing ? verticalResize.cardRowLayout?.span : null}
              side="bottom"
              statusColorKey={task.statusColorKey}
              stickyNoteColor={task.stickyNoteColor}
              onMouseDown={(e) => verticalResize.handleResizeStart(e, 'bottom')}
            />
          ) : null}
        </div>
      ) : null}


      <TaskBarCornerBadges
        effectiveIsDragging={effectiveIsDragging}
        errorTooltip={errorTooltip}
        hasQATaskInSwimlane={hasQATaskInSwimlane}
        interactionDisabled={interactionDisabled}
        isInError={isInError}
        isQATask={isQATask}
        isSelected={isSelected}
        planAnchorMoved={planAnchorMoved}
        swimlaneSegmentBadge={swimlaneSegmentBadge}
        swimlaneSegmentSecondary={swimlaneSegmentSecondary}
        task={task}
        onCreateQATask={onCreateQATask}
      />
    </>
  );
}
