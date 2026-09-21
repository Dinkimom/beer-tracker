import type { SlaBugDemoteReason, SlaBugLabelKey } from '@/lib/slaBugs';
import type { Task, TaskCardVariant, TaskPosition } from '@/types';

export interface TaskCardTagsProps {
  displayDuration?: number;
  inlineLayout?: boolean;
  releaseGitlabChecks?: {
    approvalsDone: number | null;
    approvalsRequired: number;
    lintSuccess: boolean | null;
    testsSuccess: boolean | null;
  } | null;
  releaseGitlabChecksLoading?: boolean;
  showDangerousReleaseInsteadOfStatus?: boolean;
  slaBugDemoteReason?: SlaBugDemoteReason;
  slaBugSignalLabel?: SlaBugLabelKey;
  task: Task;
  taskPosition?: TaskPosition;
  variant?: TaskCardVariant;
}
