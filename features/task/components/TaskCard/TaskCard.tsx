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

import { SprintCardPresenceAvatars } from './SprintCardPresenceAvatars';
import { useSprintCardPresenceViewers, useSprintPresenceColorSlots } from './SprintCardPresenceContext';
import { renderTaskCardBody, renderTaskCardChrome } from './taskCardContentHelpers';
import { useTaskCardVisualState } from './useTaskCardVisualState';

interface TaskCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onContextMenu'> {
  assigneeName?: string;
  children?: React.ReactNode;
  developers?: Developer[];
  dimmedByContextMenu?: boolean;
  /** Скрыть StatusTag (канбан: статус уже в колонке). */
  hideStatusTag?: boolean;
  inlineTitleEditor?: {
    onChange: (value: string) => void;
    onSubmit?: () => void;
    value: string;
  };
  isContextMenuOpen?: boolean;
  isDragging?: boolean;
  isLocalTask?: boolean;
  isNotificationFocused?: boolean;
  isQATask?: boolean;
  isResizing?: boolean;
  isSelected?: boolean;
  layoutDuration?: number;
  linkingActive?: boolean;
  linkMode?: 'source' | 'target' | null;
  releaseGitlabChecks?: {
    approvalsDone: number | null;
    approvalsRequired: number;
    lintSuccess: boolean | null;
    testsSuccess: boolean | null;
  } | null;
  releaseGitlabChecksLoading?: boolean;
  resizePreviewDuration?: number | null;
  selectedSprintId?: number | null;
  showDangerousReleaseInsteadOfStatus?: boolean;
  sprintBadge?: { display: string; id: string } | null;
  swimlaneBarDurationParts?: number;
  task: Task;
  taskPosition?: TaskPosition;
  variant: TaskCardVariant;
  widthPercent?: number;
  onAutoAddToSwimlane?: (task: Task) => void;
  onCommentUpdate?: (commentId: string, text: string) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onPhotoClick?: () => void;
}

export const TaskCard = React.forwardRef<HTMLDivElement, TaskCardProps>(({
  task,
  developers = [],
  assigneeName,
  variant,
  widthPercent,
  inlineTitleEditor,
  taskPosition,
  resizePreviewDuration,
  swimlaneBarDurationParts,
  isQATask: explicitIsQATask,
  isDragging = false,
  isResizing = false,
  isSelected = false,
  isNotificationFocused = false,
  isContextMenuOpen = false,
  dimmedByContextMenu = false,
  isLocalTask = false,
  linkMode = null,
  linkingActive = false,
  layoutDuration,
  sprintBadge,
  showDangerousReleaseInsteadOfStatus = false,
  hideStatusTag = false,
  className = '',
  style,
  onMouseDown,
  onMouseUp,
  onAutoAddToSwimlane,
  onCommentUpdate,
  onContextMenu,
  onPhotoClick,
  children,
  selectedSprintId: _,
  releaseGitlabChecks = null,
  releaseGitlabChecksLoading = false,
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
    isNotificationFocused,
    linkMode,
    linkingActive,
    resizePreviewDuration,
    swimlaneBarDurationParts,
    swimlaneCardFields: variant === 'swimlane' ? (swimlaneCardFields as SwimlaneCardFieldsVisibility) : undefined,
    task,
    taskPosition,
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

  const {
    actualDuration,
    estimatedSP,
    estimatedTimeslots,
    extraSP,
    leftPercent,
    rightPercent,
    showExtraSplit,
  } = visual.barMetrics;

  return wrapWithTextTooltip(
    <div
      ref={setCardRef}
      className={`${visual.cardRootClassName}${isResizing ? ' select-none task-card-resizing' : ''}${
        isRemoteChanging ? ' sprint-card-presence-changing' : ''
      }${taskStatusTransitionClassName(statusTransitionPhase)}${taskBoardExitClassName(boardExit)}`}
      data-context-menu-source="task-card"
      data-hide-status-tag={hideStatusTag ? '' : undefined}
      data-task-id={task.id}
      style={{
        ...visual.cardRootStyle,
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
        actualDuration,
        assigneeName,
        cardStylesQaStripedStyle: visual.cardStyles.qaStripedStyle,
        children,
        developers,
        dividerBgClass: visual.dividerBgClass,
        estimatedTimeslots,
        extraSP,
        inlineTitleEditor,
        isDark: visual.isDark,
        isDragging,
        isResizing,
        isQATask: visual.isQATask,
        isSwimlane: visual.isSwimlane,
        isVeryNarrow: visual.isVeryNarrow,
        layoutDuration: layoutDuration ?? actualDuration,
        leftPercent,
        onCommentUpdate: isPresenceLocked ? undefined : onCommentUpdate,
        onPhotoClick,
        paddingClasses: visual.paddingClasses,
        phaseCardColorScheme: visual.phaseCardColorScheme,
        qaRightBgColor: visual.qaRightBgColor,
        qaStripedStyle: visual.qaStripedStyle,
        releaseGitlabChecks,
        releaseGitlabChecksLoading,
        resolvedSwimlaneCardFields: visual.resolvedSwimlaneCardFields,
        rightPercent,
        showDangerousReleaseInsteadOfStatus,
        showExtraSplit,
        sprintBadge,
        task,
        taskPosition,
        variant,
      })}
      <SprintCardPresenceAvatars taskId={task.id} />
    </div>,
    isPresenceLocked ? t('sprintPlanner.presence.cardLocked') : undefined
  );
});

TaskCard.displayName = 'TaskCard';
