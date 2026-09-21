import type { SlaBugDemoteReason, SlaBugLabelKey } from '@/lib/slaBugs';
import type { Task, TaskCardVariant, TaskPosition } from '@/types';

import { SlaBugCloseP4Actions } from '@/features/sidebar/components/tabs/BugsTab/SlaBugCloseP4Actions';

import { TaskCardTags } from './TaskCardTags';

interface TaskCardStandardBodyTagsProps {
  actualDuration: number;
  releaseGitlabChecks?: {
    approvalsDone: number | null;
    approvalsRequired: number;
    lintSuccess: boolean | null;
    testsSuccess: boolean | null;
  } | null;
  releaseGitlabChecksLoading: boolean;
  showCloseP4Actions: boolean;
  showDangerousReleaseInsteadOfStatus: boolean;
  slaBugBoardId?: number | null;
  slaBugDemoteReason?: SlaBugDemoteReason;
  slaBugSignalLabel?: SlaBugLabelKey;
  task: Task;
  taskPosition?: TaskPosition;
  variant: TaskCardVariant;
}

export function TaskCardStandardBodyTags({
  showCloseP4Actions,
  actualDuration,
  releaseGitlabChecks,
  releaseGitlabChecksLoading,
  showDangerousReleaseInsteadOfStatus,
  slaBugDemoteReason,
  slaBugSignalLabel,
  task,
  taskPosition,
  variant,
  slaBugBoardId,
}: TaskCardStandardBodyTagsProps) {
  const tags = (
    <TaskCardTags
      displayDuration={actualDuration}
      inlineLayout={showCloseP4Actions}
      releaseGitlabChecks={releaseGitlabChecks}
      releaseGitlabChecksLoading={releaseGitlabChecksLoading}
      showDangerousReleaseInsteadOfStatus={showDangerousReleaseInsteadOfStatus}
      slaBugDemoteReason={slaBugDemoteReason}
      slaBugSignalLabel={slaBugSignalLabel}
      task={task}
      taskPosition={taskPosition}
      variant={variant}
    />
  );

  if (!showCloseP4Actions) {
    return tags;
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      {tags}
      <SlaBugCloseP4Actions
        boardId={slaBugBoardId}
        issueKey={task.id}
        trackerTags={task.trackerTags}
      />
    </div>
  );
}
