import type {
  PlanningPhaseCardColorScheme,
  SwimlaneCardFieldsVisibility,
} from '@/hooks/useLocalStorage';
import type { SlaBugDemoteReason, SlaBugLabelKey } from '@/lib/slaBugs';
import type { Developer, Task, TaskCardVariant, TaskPosition } from '@/types';

import React from 'react';

import { TaskCardBody } from './TaskCardBody';
import { TaskCardExtraSplitOverlay } from './TaskCardExtraSplitOverlay';
import { TaskCardSprintBadges } from './TaskCardSprintBadges';
import { TaskCardStandardBodyTags } from './TaskCardStandardBodyTags';

interface TaskCardStandardBodyProps {
  actualDuration: number;
  assigneeName?: string;
  children?: React.ReactNode;
  developers: Developer[];
  dividerBgClass: string;
  extraSP: number;
  inlineTitleEditor?: {
    onChange: (value: string) => void;
    onSubmit?: () => void;
    value: string;
  };
  isDark: boolean;
  isDragging: boolean;
  isQATask: boolean;
  isResizing?: boolean;
  isSwimlane: boolean;
  isVeryNarrow: boolean;
  layoutDuration: number;
  leftPercent: number;
  phaseCardColorScheme: PlanningPhaseCardColorScheme;
  qaRightBgColor?: string;
  releaseGitlabChecks?: {
    approvalsDone: number | null;
    approvalsRequired: number;
    lintSuccess: boolean | null;
    testsSuccess: boolean | null;
  } | null;
  releaseGitlabChecksLoading?: boolean;
  rightPercent: number;
  showDangerousReleaseInsteadOfStatus?: boolean;
  showExtraSplit: boolean;
  slaBugBoardId?: number | null;
  slaBugCloseP4ActionsEnabled?: boolean;
  slaBugDemoteReason?: SlaBugDemoteReason;
  slaBugSignalLabel?: SlaBugLabelKey;
  sprintBadge?: { display: string; id: string } | null;
  swimlaneCardFields: SwimlaneCardFieldsVisibility | undefined;
  task: Task;
  taskPosition?: TaskPosition;
  variant: TaskCardVariant;
  onCommentUpdate?: (commentId: string, text: string) => void;
  onPhotoClick?: () => void;
}

export function TaskCardStandardBody({
  showExtraSplit,
  isSwimlane,
  isQATask,
  qaRightBgColor,
  releaseGitlabChecks,
  releaseGitlabChecksLoading = false,
  leftPercent,
  rightPercent,
  dividerBgClass,
  extraSP,
  isVeryNarrow,
  layoutDuration,
  inlineTitleEditor,
  isDark,
  assigneeName,
  developers,
  actualDuration,
  isDragging,
  isResizing = false,
  onCommentUpdate,
  onPhotoClick,
  phaseCardColorScheme,
  swimlaneCardFields,
  task,
  variant,
  taskPosition,
  sprintBadge,
  showDangerousReleaseInsteadOfStatus = false,
  slaBugBoardId,
  slaBugCloseP4ActionsEnabled = false,
  slaBugDemoteReason,
  slaBugSignalLabel,
  children,
}: TaskCardStandardBodyProps) {
  const showCloseP4Actions =
    variant === 'sidebar' &&
    slaBugCloseP4ActionsEnabled &&
    slaBugSignalLabel === 'close_p4';
  const showTpLabels = isQATask && task.hideTestPointsByIntegration !== true;

  return (
    <>
      {showExtraSplit && isSwimlane && (
        <TaskCardExtraSplitOverlay
          dividerBgClass={dividerBgClass}
          extraSP={extraSP}
          isDark={isDark}
          isQATask={isQATask}
          isVeryNarrow={isVeryNarrow}
          leftPercent={leftPercent}
          qaRightBgColor={qaRightBgColor}
          rightPercent={rightPercent}
          showTpLabels={showTpLabels}
        />
      )}
      <TaskCardSprintBadges sprintBadge={sprintBadge} />

      <div
        className={`flex flex-col min-h-0 overflow-hidden${isSwimlane ? ' flex-1' : ''}`}
        style={showExtraSplit && isSwimlane ? { width: `${leftPercent}%` } : undefined}
      >
        <TaskCardBody
          actualDuration={actualDuration}
          assigneeName={assigneeName}
          developers={developers}
          displayDuration={layoutDuration}
          inlineTitleEditor={inlineTitleEditor}
          isDragging={isDragging}
          isQATask={isQATask}
          isResizing={isResizing}
          phaseCardColorScheme={phaseCardColorScheme}
          swimlaneCardFields={swimlaneCardFields}
          task={task}
          variant={variant}
          onCommentUpdate={onCommentUpdate}
          onPhotoClick={onPhotoClick}
        />
      </div>

      <TaskCardStandardBodyTags
        actualDuration={actualDuration}
        releaseGitlabChecks={releaseGitlabChecks}
        releaseGitlabChecksLoading={releaseGitlabChecksLoading}
        showCloseP4Actions={showCloseP4Actions}
        showDangerousReleaseInsteadOfStatus={showDangerousReleaseInsteadOfStatus}
        slaBugBoardId={slaBugBoardId}
        slaBugDemoteReason={slaBugDemoteReason}
        slaBugSignalLabel={slaBugSignalLabel}
        task={task}
        taskPosition={taskPosition}
        variant={variant}
      />

      {children}
    </>
  );
}
