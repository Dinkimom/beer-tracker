'use client';

import type { SwimlaneCardFieldsVisibility } from '@/hooks/useLocalStorage';
import type { Task, Developer, TaskCardVariant, TaskPosition } from '@/types';

import React from 'react';

import { wrapWithTextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { useStickyNoteTilt } from '@/features/comments/hooks/useStickyNoteTilt';
import { isSwimlaneCommentTask } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { useTaskBoardExit } from '@/features/task/hooks/useTaskBoardExit';
import { useTaskStatusTransitionPhase } from '@/features/task/hooks/useTaskStatusTransitionPhase';
import { taskBoardExitClassName } from '@/features/task/utils/taskBoardExit';
import { taskStatusTransitionClassName } from '@/features/task/utils/taskStatusTransitionFeedback';
import { useSwimlaneCardFieldsStorage } from '@/hooks/useLocalStorage';
import { sprintCardPresenceChangingViewer, sprintCardPresenceIsLockedByRemote } from '@/lib/realtime/sprintCardPresence';
import { SPRINT_PRESENCE_COLOR_CSS_VAR, sprintPresenceViewerColor } from '@/lib/realtime/sprintPresenceColor';
import { getBrowserRealtimeClientId } from '@/lib/realtime/sprintRealtimeClientId';
import { getStatusColors, resolvePaletteStatusKey } from '@/utils/statusColors';

import { SprintCardPresenceAvatars, sprintCardPresenceInset } from './SprintCardPresenceAvatars';
import { useSprintCardPresenceViewers, useSprintPresenceColorSlots } from './SprintCardPresenceContext';
import { renderTaskCardBody, renderTaskCardChrome } from './taskCardContentHelpers';
import { useTaskCardVisualState } from './useTaskCardVisualState';

/** Что лист карточки дорожки правит или открывает сам: заголовок черновика, текст заметки, фото. */
export interface TaskCardEditing {
  inlineTitleEditor?: {
    onChange: (value: string) => void;
    onSubmit?: () => void;
    value: string;
  };
  onCommentUpdate?: (commentId: string, text: string) => void;
  onPhotoClick?: () => void;
}

/** Поля варианта дорожки — передаёт только карточка свимлейна. */
export interface TaskCardSwimlaneProps extends TaskCardEditing {
  isNotificationFocused?: boolean;
  layoutDuration?: number;
  linkingActive?: boolean;
  linkMode?: 'source' | 'target' | null;
  resizePreviewDuration?: number | null;
  taskPosition?: TaskPosition;
}

export interface TaskCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onContextMenu'> {
  assigneeName?: string;
  children?: React.ReactNode;
  developers?: Developer[];
  dimmedByContextMenu?: boolean;
  isContextMenuOpen?: boolean;
  isDragging?: boolean;
  isLocalTask?: boolean;
  isQATask?: boolean;
  isResizing?: boolean;
  isSelected?: boolean;
  /** Только для `variant="swimlane"`: редактор заголовка, раскладка, ресайз, связи, позиция, заметка и фото. */
  swimlane?: TaskCardSwimlaneProps;
  swimlaneBarDurationParts?: number;
  task: Task;
  variant: TaskCardVariant;
  widthPercent?: number;
  onAutoAddToSwimlane?: (task: Task) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
}

export const TaskCard = React.forwardRef<HTMLDivElement, TaskCardProps>(({
  task,
  swimlane = {},
  developers = [],
  assigneeName,
  variant,
  widthPercent,
  swimlaneBarDurationParts,
  isQATask: explicitIsQATask,
  isDragging = false,
  isResizing = false,
  isSelected = false,
  isContextMenuOpen = false,
  dimmedByContextMenu = false,
  isLocalTask = false,
  className = '',
  style,
  onMouseDown,
  onMouseUp,
  onAutoAddToSwimlane,
  onContextMenu,
  children,
  ...restProps
}, ref) => {
  const { t } = useI18n();
  const [swimlaneCardFields] = useSwimlaneCardFieldsStorage();
  const effectiveIsLocalTask = isLocalTask || task.isLocalTask === true;
  const presenceViewers = useSprintCardPresenceViewers(task.id);
  const isPresenceLocked = sprintCardPresenceIsLockedByRemote(
    presenceViewers,
    getBrowserRealtimeClientId() || null
  );

  const visual = useTaskCardVisualState({
    className,
    dimmedByContextMenu,
    isContextMenuOpen,
    isDragging,
    isLocalTask: effectiveIsLocalTask,
    isLocked: isPresenceLocked,
    isQATask: explicitIsQATask,
    isResizing,
    isSelected,
    swimlane,
    swimlaneBarDurationParts,
    swimlaneCardFields: variant === 'swimlane' ? (swimlaneCardFields as SwimlaneCardFieldsVisibility) : undefined,
    task,
    variant,
    widthPercent,
  });
  const presenceColorSlots = useSprintPresenceColorSlots();
  const remoteChangingViewer = sprintCardPresenceChangingViewer(presenceViewers);
  const isRemoteChanging = remoteChangingViewer != null;
  const statusTransitionPhase = useTaskStatusTransitionPhase(task.id, task.originalTaskId);
  const boardExit = useTaskBoardExit(task.id, task.originalTaskId);
  const tiltRef = useStickyNoteTilt(
    variant === 'swimlane' && isSwimlaneCommentTask(task),
    task.id
  );
  const setCardRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      tiltRef(node);
      if (typeof ref === 'function') {
        ref(node);
        return;
      }
      if (ref) {
        ref.current = node;
      }
    },
    [ref, tiltRef]
  );

  const { inlineTitleEditor, layoutDuration, onCommentUpdate, onPhotoClick, taskPosition } = swimlane;
  const { actualDuration, estimatedSP } = visual.barMetrics;

  return wrapWithTextTooltip(
    <div
      ref={setCardRef}
      className={`${visual.cardRootClassName}${isResizing ? ' select-none task-card-resizing' : ''}${
        isRemoteChanging ? ' sprint-card-presence-changing' : ''
      }${taskStatusTransitionClassName(statusTransitionPhase)}${taskBoardExitClassName(boardExit)}`}
      data-card-presence={presenceViewers.length > 0 ? '' : undefined}
      data-context-menu-source="task-card"
      data-task-id={task.id}
      style={{
        ...visual.cardRootStyle,
        ...(presenceViewers.length > 0
          ? ({ '--card-presence-inset': sprintCardPresenceInset(presenceViewers.length) } as React.CSSProperties)
          : {}),
        ...(remoteChangingViewer
          ? ({
              [SPRINT_PRESENCE_COLOR_CSS_VAR]: sprintPresenceViewerColor(presenceColorSlots, remoteChangingViewer),
            } as React.CSSProperties)
          : {}),
        ...(statusTransitionPhase === 'applied'
          ? ({
              // Кольцо «переход принят» в цвет нового статуса (globals.css).
              '--task-status-accent': getStatusColors(
                resolvePaletteStatusKey(task.originalStatus, task.statusColorKey)
              ).arrow.default,
            } as React.CSSProperties)
          : {}),
        ...style,
      }}
      onContextMenu={(e) => {
        if (effectiveIsLocalTask || (isPresenceLocked && !isDragging && !isResizing)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (!isDragging && !isResizing && onContextMenu) {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e, task);
        }
      }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      {...restProps}
      aria-busy={isRemoteChanging || statusTransitionPhase === 'pending' || undefined}
      aria-disabled={isPresenceLocked || undefined}
    >
      {renderTaskCardChrome({
        developerIds: developers.map((developer) => developer.id),
        estimatedSP,
        onAutoAddToSwimlane,
        task,
        variant,
      })}
      {renderTaskCardBody({
        assigneeName,
        children,
        developers,
        editing: {
          inlineTitleEditor,
          onCommentUpdate: isPresenceLocked ? undefined : onCommentUpdate,
          onPhotoClick,
        },
        isDragging,
        isResizing,
        layoutDuration: layoutDuration ?? actualDuration,
        task,
        taskPosition,
        variant,
        visual,
      })}
      <SprintCardPresenceAvatars taskId={task.id} />
    </div>,
    isPresenceLocked ? t('sprintPlanner.presence.cardLocked') : undefined
  );
});

TaskCard.displayName = 'TaskCard';
