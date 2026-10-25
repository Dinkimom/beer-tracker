import type { Task, TaskCardVariant, TaskPosition } from '@/types';

export interface TaskCardTagsProps {
  displayDuration?: number;
  releaseGitlabChecks?: {
    approvalsDone: number | null;
    approvalsRequired: number;
    lintSuccess: boolean | null;
    testsSuccess: boolean | null;
  } | null;
  releaseGitlabChecksLoading?: boolean;
  showDangerousReleaseInsteadOfStatus?: boolean;
  task: Task;
  taskPosition?: TaskPosition;
  variant?: TaskCardVariant;
}
