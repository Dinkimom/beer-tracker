'use client';

import type { SwimlaneCardFieldsVisibility } from '@/hooks/useLocalStorage';
import type { SlaBugDemoteReason, SlaBugLabelKey } from '@/lib/slaBugs';
import type { Task, Developer, TaskCardVariant, TaskPosition } from '@/types';

import React from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { useSwimlaneCardFieldsStorage } from '@/hooks/useLocalStorage';
import { sprintCardPresenceHasChangingViewer, sprintCardPresenceIsLockedByRemote } from '@/lib/realtime/sprintCardPresence';
import { getBrowserRealtimeClientId } from '@/lib/realtime/sprintRealtimeClientId';

import { SprintCardPresenceAvatars } from './SprintCardPresenceAvatars';
import { useSprintCardPresenceViewers } from './SprintCardPresenceContext';
import { renderTaskCardBody, renderTaskCardChrome } from './taskCardContentHelpers';
import { useTaskCardVisualState } from './useTaskCardVisualState';

interface TaskCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onContextMenu'> {
  assigneeName?: string;
  children?: React.ReactNode;
  developers?: Developer[];
  dimmedByContextMenu?: boolean;
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
  previewBorder?: string;
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
  slaBugBoardId?: number | null;
  slaBugCloseP4ActionsEnabled?: boolean;
  slaBugDemoteReason?: SlaBugDemoteReason;
  slaBugSignalLabel?: SlaBugLabelKey;
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
  slaBugBoardId,
  slaBugCloseP4ActionsEnabled = false,
  slaBugDemoteReason,
  slaBugSignalLabel,
  previewBorder,
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
    previewBorder,
    resizePreviewDuration,
    swimlaneBarDurationParts,
    swimlaneCardFields: variant === 'swimlane' ? (swimlaneCardFields as SwimlaneCardFieldsVisibility) : undefined,
    task,
    taskPosition,
    variant,
    widthPercent,
  });
  const isRemoteChanging = sprintCardPresenceHasChangingViewer(presenceViewers);

  const {
    actualDuration,
    estimatedSP,
    estimatedTimeslots,
    extraSP,
    leftPercent,
    rightPercent,
    showExtraSplit,
  } = visual.barMetrics;

  return (
    <div
      ref={ref}
      className={`${visual.cardRootClassName}${isResizing ? ' select-none' : ''}${
        isRemoteChanging ? ' sprint-card-presence-changing' : ''
      }`}
      data-context-menu-source="task-card"
      data-task-id={task.id}
      style={{ ...visual.cardRootStyle, ...style }}
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
      aria-busy={isRemoteChanging || undefined}
      aria-disabled={isPresenceLocked || undefined}
      title={isPresenceLocked ? t('sprintPlanner.presence.cardLocked') : undefined}
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
        slaBugBoardId,
        slaBugCloseP4ActionsEnabled,
        slaBugDemoteReason,
        slaBugSignalLabel,
        sprintBadge,
        task,
        taskPosition,
        variant,
      })}
      <SprintCardPresenceAvatars taskId={task.id} />
    </div>
  );
});

TaskCard.displayName = 'TaskCard';
