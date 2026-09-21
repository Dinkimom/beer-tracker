import type { SwimlaneCardFieldsVisibility, PlanningPhaseCardColorScheme } from '@/hooks/useLocalStorage';
import type { SlaBugDemoteReason, SlaBugLabelKey } from '@/lib/slaBugs';
import type { Task, Developer, TaskCardVariant, TaskPosition } from '@/types';
import type { CSSProperties } from 'react';

import { TaskCardAutoAddToSwimlaneButton } from './components/TaskCardAutoAddToSwimlaneButton';
import { TaskCardSidebarResizedSplit } from './components/TaskCardSidebarResizedSplit';
import { TaskCardStandardBody } from './components/TaskCardStandardBody';
import { shouldRenderTaskCardSidebarSplit } from './taskCardRenderHelpers';

interface RenderTaskCardBodyParams {
  actualDuration: number;
  assigneeName?: string;
  cardStylesQaStripedStyle?: CSSProperties;
  children?: React.ReactNode;
  developers: Developer[];
  dividerBgClass: string;
  estimatedTimeslots: number;
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
  paddingClasses: string;
  phaseCardColorScheme: PlanningPhaseCardColorScheme;
  qaRightBgColor?: string;
  qaStripedStyle?: CSSProperties;
  releaseGitlabChecks?: {
    approvalsDone: number | null;
    approvalsRequired: number;
    lintSuccess: boolean | null;
    testsSuccess: boolean | null;
  } | null;
  releaseGitlabChecksLoading: boolean;
  resolvedSwimlaneCardFields: SwimlaneCardFieldsVisibility | undefined;
  rightPercent: number;
  showDangerousReleaseInsteadOfStatus: boolean;
  showExtraSplit: boolean;
  slaBugBoardId?: number | null;
  slaBugCloseP4ActionsEnabled: boolean;
  slaBugDemoteReason?: SlaBugDemoteReason;
  slaBugSignalLabel?: SlaBugLabelKey;
  sprintBadge?: { display: string; id: string } | null;
  task: Task;
  taskPosition?: TaskPosition;
  variant: TaskCardVariant;
  onCommentUpdate?: (commentId: string, text: string) => void;
  onPhotoClick?: () => void;
}

export function renderTaskCardBody(params: RenderTaskCardBodyParams): React.ReactNode {
  const showSidebarSplit = shouldRenderTaskCardSidebarSplit({
    showExtraSplit: params.showExtraSplit,
    variant: params.variant,
  });

  return showSidebarSplit ? (
    <TaskCardSidebarResizedSplit
      assigneeName={params.assigneeName}
      developers={params.developers}
      dividerBgClass={params.dividerBgClass}
      estimatedTimeslots={params.estimatedTimeslots}
      extraSP={params.extraSP}
      isDark={params.isDark}
      isDragging={params.isDragging}
      isQATask={params.isQATask}
      leftPercent={params.leftPercent}
      paddingClasses={params.paddingClasses}
      phaseCardColorScheme={params.phaseCardColorScheme}
      qaRightBgColor={params.qaRightBgColor}
      qaStripedStyle={params.qaStripedStyle}
      rightPercent={params.rightPercent}
      showExtraSplit={params.showExtraSplit}
      showQaStripedLeftOverlay={Boolean(
        params.isQATask && params.cardStylesQaStripedStyle && params.qaStripedStyle
      )}
      slaBugDemoteReason={params.slaBugDemoteReason}
      slaBugSignalLabel={params.slaBugSignalLabel}
      sprintBadge={params.sprintBadge}
      swimlaneCardFields={params.resolvedSwimlaneCardFields}
      task={params.task}
      taskPosition={params.taskPosition}
      variant={params.variant}
    >
      {params.children}
    </TaskCardSidebarResizedSplit>
  ) : (
    <TaskCardStandardBody
      actualDuration={params.actualDuration}
      assigneeName={params.assigneeName}
      developers={params.developers}
      dividerBgClass={params.dividerBgClass}
      extraSP={params.extraSP}
      inlineTitleEditor={params.inlineTitleEditor}
      isDark={params.isDark}
      isDragging={params.isDragging}
      isQATask={params.isQATask}
      isResizing={params.isResizing}
      isSwimlane={params.isSwimlane}
      isVeryNarrow={params.isVeryNarrow}
      layoutDuration={params.layoutDuration}
      leftPercent={params.leftPercent}
      phaseCardColorScheme={params.phaseCardColorScheme}
      qaRightBgColor={params.qaRightBgColor}
      releaseGitlabChecks={params.releaseGitlabChecks}
      releaseGitlabChecksLoading={params.releaseGitlabChecksLoading}
      rightPercent={params.rightPercent}
      showDangerousReleaseInsteadOfStatus={params.showDangerousReleaseInsteadOfStatus}
      showExtraSplit={params.showExtraSplit}
      slaBugBoardId={params.slaBugBoardId}
      slaBugCloseP4ActionsEnabled={params.slaBugCloseP4ActionsEnabled}
      slaBugDemoteReason={params.slaBugDemoteReason}
      slaBugSignalLabel={params.slaBugSignalLabel}
      sprintBadge={params.sprintBadge}
      swimlaneCardFields={params.resolvedSwimlaneCardFields}
      task={params.task}
      taskPosition={params.taskPosition}
      variant={params.variant}
      onCommentUpdate={params.onCommentUpdate}
      onPhotoClick={params.onPhotoClick}
    >
      {params.children}
    </TaskCardStandardBody>
  );
}

export function renderTaskCardChrome(params: {
  developerIds: readonly string[];
  onAutoAddToSwimlane?: (task: Task) => void;
  task: Task;
  variant: TaskCardVariant;
  estimatedSP: number;
}): React.ReactNode {
  if (params.variant !== 'sidebar' || !params.onAutoAddToSwimlane) {
    return null;
  }
  return (
    <TaskCardAutoAddToSwimlaneButton
      developerIds={params.developerIds}
      estimatedSP={params.estimatedSP}
      task={params.task}
      onAutoAddToSwimlane={params.onAutoAddToSwimlane}
    />
  );
}
