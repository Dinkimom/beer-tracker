import type {
  PlanningPhaseCardColorScheme,
  SwimlaneCardFieldsVisibility,
} from '@/hooks/useLocalStorage';
import type { Developer, Task, TaskCardVariant, TaskPosition } from '@/types';

import React from 'react';

import { resolveTaskCardEstimateVisibility } from '../taskCardEstimateVisibility';
import { useTaskCardEstimateMapping } from '../useTaskCardEstimateMapping';

import { TaskCardBody } from './TaskCardBody';
import { TaskCardExtraSplitOverlay } from './TaskCardExtraSplitOverlay';
import { TaskCardSprintBadges } from './TaskCardSprintBadges';
import { TaskCardTags } from './TaskCardTags';

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
  children,
}: TaskCardStandardBodyProps) {
  const estimateMapping = useTaskCardEstimateMapping();
  const showTpLabels = isQATask && task.hideTestPointsByIntegration !== true;
  const showPointsLabel = resolveTaskCardEstimateVisibility({
    hideTestPoints: task.hideTestPointsByIntegration === true,
    isQATask,
    mapping: estimateMapping,
    showEstimatesSetting:
      variant === 'swimlane' ? (swimlaneCardFields?.showEstimates ?? true) : true,
    taskId: task.id,
  }).showPrimaryEstimate;

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
          showPointsLabel={showPointsLabel}
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
          task={task}
          variant={variant}
          onCommentUpdate={onCommentUpdate}
          onPhotoClick={onPhotoClick}
        />
      </div>

      <TaskCardTags
        displayDuration={actualDuration}
        releaseGitlabChecks={releaseGitlabChecks}
        releaseGitlabChecksLoading={releaseGitlabChecksLoading}
        showDangerousReleaseInsteadOfStatus={showDangerousReleaseInsteadOfStatus}
        task={task}
        taskPosition={taskPosition}
        variant={variant}
      />

      {children}
    </>
  );
}
