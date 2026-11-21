'use client';

import type { ResizeHandleCornerStyle } from './components/taskBarResizeHandleHelpers';
import type { Task } from '@/types';

import React from 'react';

import { TaskBarResizeHandle } from './components/TaskBarResizeHandle';

export interface TaskBarResizeHandlesProps {
  cornerStyle?: ResizeHandleCornerStyle;
  disableResize: boolean;
  interactionDisabled: boolean;
  isDraftTask: boolean;
  isQATask: boolean;
  resize: {
    handleResizeStart: (e: React.MouseEvent, side: 'left' | 'right') => void;
    isResizing: boolean;
    resizePreviewDuration: number | null;
    resizeSide: 'left' | 'right' | null;
  };
  /** Заметка и фото тянутся и по высоте. */
  showVerticalResize?: boolean;
  task: Task;
  verticalResize?: {
    /** Раскладка заметки в строках (span меняется по шагам жеста). */
    cardRowLayout?: { span: number };
    handleResizeStart: (e: React.MouseEvent, side: 'bottom' | 'top') => void;
    isResizing: boolean;
    resizeSide: 'bottom' | 'top' | null;
  };
}

/** Ручки длительности по бокам карточки и, у заметки и фото, ручка высоты снизу. */
export function TaskBarResizeHandles({
  cornerStyle = 'rounded',
  disableResize,
  interactionDisabled,
  isDraftTask,
  isQATask,
  resize,
  showVerticalResize = false,
  task,
  verticalResize,
}: TaskBarResizeHandlesProps) {
  if (disableResize || interactionDisabled) {
    return null;
  }
  const look = {
    cornerStyle,
    isDraftTask,
    isQATask,
    originalStatus: task.originalStatus,
    statusColorKey: task.statusColorKey,
  };
  const width = {
    ...look,
    isResizing: resize.isResizing,
    resizeSide: resize.resizeSide,
    resizeStep: resize.resizePreviewDuration,
    stickyNoteColor: cornerStyle === 'square' ? task.stickyNoteColor : undefined,
  };

  return (
    <div
      className={`task-bar-resize-handle-chrome${
        cornerStyle === 'square' ? ' task-bar-resize-handle-chrome--tilted' : ''
      }`}
    >
      <TaskBarResizeHandle {...width} side="right" onMouseDown={(e) => resize.handleResizeStart(e, 'right')} />
      <TaskBarResizeHandle {...width} side="left" onMouseDown={(e) => resize.handleResizeStart(e, 'left')} />
      {showVerticalResize && verticalResize ? (
        <TaskBarResizeHandle
          {...look}
          isResizing={verticalResize.isResizing}
          resizeSide={verticalResize.resizeSide}
          resizeStep={verticalResize.isResizing ? verticalResize.cardRowLayout?.span : null}
          side="bottom"
          stickyNoteColor={task.stickyNoteColor}
          onMouseDown={(e) => verticalResize.handleResizeStart(e, 'bottom')}
        />
      ) : null}
    </div>
  );
}
