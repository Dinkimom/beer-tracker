import type { Task, TaskCardVariant } from '@/types';

import { ZIndex } from '@/constants';
import { formatTaskStoryPointsForDisplay } from '@/lib/pointsUtils';

type Translate = (key: string, params?: Record<string, number | string>) => string;

function dangerousReleaseClasses(value: string | undefined): string {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'низкий' || normalized === 'low') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  }
  if (normalized === 'средний' || normalized === 'medium') {
    return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  }
  if (normalized === 'высокий' || normalized === 'high') {
    return 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
  }
  return 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-200';
}

export function gitlabStatusTagClasses(ok: boolean): string {
  return ok
    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    : 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
}

function tagTextSizeClass(isVeryNarrow: boolean, isNarrow: boolean): string {
  if (isVeryNarrow) return 'text-[8px]';
  if (isNarrow) return 'text-[9px]';
  return 'text-[11px]';
}

function gitlabTriStateLabel(value: boolean | null | undefined, t: Translate): string {
  if (value == null) return t('sidebar.releasesTab.gitlabUnknown');
  return value ? t('sidebar.releasesTab.gitlabYes') : t('sidebar.releasesTab.gitlabNo');
}

export function resolveContainerClass({
  containerPadding,
  inlineLayout,
  isReleaseSidebarCard,
}: {
  containerPadding: string;
  inlineLayout: boolean;
  isReleaseSidebarCard: boolean;
}): string {
  if (isReleaseSidebarCard) {
    return 'mt-1.5 flex min-w-0 flex-col gap-2 overflow-hidden';
  }
  if (inlineLayout) {
    return 'flex min-w-0 flex-col gap-1.5 overflow-hidden';
  }
  return `absolute ${containerPadding} flex min-w-0 flex-col gap-1.5 overflow-hidden ${ZIndex.class('stickyElevated')} pointer-events-none`;
}

export function resolveTaskCardTagsLayout(variant: TaskCardVariant, displayDuration?: number) {
  const isSwimlane = variant === 'swimlane';
  const isVeryNarrow = isSwimlane && displayDuration !== undefined && displayDuration < 3;
  const isNarrow = isSwimlane && displayDuration !== undefined && displayDuration < 4;
  return {
    containerPadding: isVeryNarrow ? 'left-1 right-1 bottom-1' : 'left-1.5 right-1.5 bottom-1.5',
    isNarrow,
    isVeryNarrow,
    tagTextSize: tagTextSizeClass(isVeryNarrow, isNarrow),
  };
}

export function resolveGitlabChecksDisplay(input: {
  releaseGitlabChecks?: {
    approvalsDone: number | null;
    approvalsRequired: number;
    lintSuccess: boolean | null;
    testsSuccess: boolean | null;
  } | null;
  t: Translate;
}) {
  const approvalsRequired = Math.max(2, input.releaseGitlabChecks?.approvalsRequired ?? 2);
  const approvalsDone = input.releaseGitlabChecks?.approvalsDone;
  const approvalsValue =
    approvalsDone == null ? `—/${approvalsRequired}` : `${approvalsDone}/${approvalsRequired}`;
  return {
    approvalsOk: approvalsDone != null && approvalsDone >= approvalsRequired,
    approvalsValue,
    lintOk: input.releaseGitlabChecks?.lintSuccess === true,
    lintValue: gitlabTriStateLabel(input.releaseGitlabChecks?.lintSuccess, input.t),
    testsOk: input.releaseGitlabChecks?.testsSuccess === true,
    testsValue: gitlabTriStateLabel(input.releaseGitlabChecks?.testsSuccess, input.t),
  };
}

export function resolveTaskCardTagsPoints(task: Task) {
  const spText = formatTaskStoryPointsForDisplay(task, 'compact');
  const hideTestPoints = task.hideTestPointsByIntegration === true;
  const dangerousReleaseValue = task.dangerousRelease?.trim();
  return {
    dangerousReleaseColorClasses: dangerousReleaseClasses(dangerousReleaseValue),
    dangerousReleaseValue,
    hideTestPoints,
    spText,
  };
}

export function isSwimlaneTaskCardTagsVariant(variant: TaskCardVariant): boolean {
  return variant === 'swimlane';
}

export function isReleaseSidebarTaskCardTags(
  variant: TaskCardVariant,
  showDangerousReleaseInsteadOfStatus: boolean
): boolean {
  return variant === 'sidebar' && showDangerousReleaseInsteadOfStatus;
}
