'use client';

import type { ResizeHandleCornerStyle } from './components/taskBarResizeHandleHelpers';
import type { Task } from '@/types';

import React from 'react';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { TaskCardSwimlaneSegmentBadge } from '@/features/task/components/TaskCard/components/TaskCardSwimlaneSegmentBadge';

import { TaskBarQACreateButton } from './components/TaskBarQACreateButton';
import { TaskBarResizeHandle } from './components/TaskBarResizeHandle';
import { TaskBarVerticalResizeHandle } from './components/TaskBarVerticalResizeHandle';

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
  resize: {
    handleResizeStart: (e: React.MouseEvent, side: 'left' | 'right') => void;
    isResizing: boolean;
    resizeSide: 'left' | 'right' | null;
  };
  showVerticalResize?: boolean;
  swimlaneSegmentBadge?: { index: number; total: number } | null;
  swimlaneSegmentSecondary: boolean;
  task: Task;
  verticalResize?: {
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
  resize,
  showVerticalResize = false,
  swimlaneSegmentBadge,
  swimlaneSegmentSecondary,
  task,
  verticalResize,
}: TaskBarOpacityLayerChromeProps) {
  const { t } = useI18n();
  const showResizeHandles = !isSelected && !disableResize && !interactionDisabled;

  return (
    <>
      {!swimlaneSegmentSecondary && (
        <TaskBarQACreateButton
          hasQATaskInSwimlane={hasQATaskInSwimlane}
          isDragging={effectiveIsDragging}
          isInError={isInError}
          isQATask={isQATask}
          isSelected={isSelected}
          task={task}
          onCreateQATask={onCreateQATask}
        />
      )}

      {showResizeHandles ? (
        <div className="task-bar-resize-handle-chrome">
          <TaskBarResizeHandle
            cornerStyle={cornerStyle}
            isDraftTask={isDraftTask}
            isQATask={isQATask}
            isResizing={resize.isResizing}
            originalStatus={task.originalStatus}
            resizeSide={resize.resizeSide}
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
            side="left"
            statusColorKey={task.statusColorKey}
            stickyNoteColor={cornerStyle === 'square' ? task.stickyNoteColor : undefined}
            onMouseDown={(e) => resize.handleResizeStart(e, 'left')}
          />

          {showVerticalResize && verticalResize ? (
            <TaskBarVerticalResizeHandle
              cornerStyle={cornerStyle}
              isDraftTask={isDraftTask}
              isQATask={isQATask}
              isResizing={verticalResize.isResizing}
              originalStatus={task.originalStatus}
              resizeSide={verticalResize.resizeSide}
              side="bottom"
              statusColorKey={task.statusColorKey}
              stickyNoteColor={task.stickyNoteColor}
              onMouseDown={(e) => verticalResize.handleResizeStart(e, 'bottom')}
            />
          ) : null}
        </div>
      ) : null}

      {isInError && !swimlaneSegmentSecondary && (
        <span
          className="absolute -right-2 -top-2"
          style={{ zIndex: ZIndex.value('dropdown') }}
        >
          <TextTooltip content={errorTooltip || t('task.taskBar.planningError')}>
            <span
              className={`task-card-swimlane-corner-badge inline-flex w-5 h-5 items-center justify-center rounded-full bg-red-500 dark:bg-red-400 text-white shrink-0 border-2 border-white dark:border-gray-800 shadow-sm cursor-default hover:scale-125 ${
                interactionDisabled ? 'pointer-events-none' : 'pointer-events-auto'
              }`}
            >
              <Icon className="w-3 h-3 shrink-0" name="exclamation" />
            </span>
          </TextTooltip>
        </span>
      )}

      {swimlaneSegmentBadge ? (
        <TaskCardSwimlaneSegmentBadge
          interactionDisabled={interactionDisabled}
          swimlaneSegmentBadge={swimlaneSegmentBadge}
        />
      ) : null}
    </>
  );
}
