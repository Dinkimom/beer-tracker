'use client';

import { useI18n } from '@/contexts/LanguageContext';

import { gitlabStatusTagClasses } from './taskCardTagsHelpers';

interface TaskCardTagsGitlabSectionProps {
  gitlabChecks: {
    approvalsOk: boolean;
    approvalsValue: string;
    lintOk: boolean;
    lintValue: string;
    testsOk: boolean;
    testsValue: string;
  } | null;
  loading: boolean;
  releaseGitlabChecks?: {
    approvalsDone: number | null;
    approvalsRequired: number;
    lintSuccess: boolean | null;
    testsSuccess: boolean | null;
  } | null;
}

export function TaskCardTagsGitlabSection({
  gitlabChecks,
  loading,
  releaseGitlabChecks,
}: TaskCardTagsGitlabSectionProps) {
  const { t } = useI18n();

  if (!loading && !releaseGitlabChecks) {
    return null;
  }

  if (loading) {
    return (
      <div className="text-[12px] font-medium text-gray-600 dark:text-gray-300">
        🐙 {t('sidebar.releasesTab.gitlabChecksLoading')}
      </div>
    );
  }

  if (!gitlabChecks) return null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span
        className={`text-[12px] font-semibold leading-none whitespace-nowrap px-1.5 py-0.5 rounded shrink-0 border ${gitlabStatusTagClasses(gitlabChecks.approvalsOk)}`}
      >
        {`✅ ${t('sidebar.releasesTab.gitlabApprovals', { value: gitlabChecks.approvalsValue })}`}
      </span>
      <span
        className={`text-[12px] font-semibold leading-none whitespace-nowrap px-1.5 py-0.5 rounded shrink-0 border ${gitlabStatusTagClasses(gitlabChecks.lintOk)}`}
      >
        {`🧹 ${t('sidebar.releasesTab.gitlabLinter', { value: gitlabChecks.lintValue })}`}
      </span>
      <span
        className={`text-[12px] font-semibold leading-none whitespace-nowrap px-1.5 py-0.5 rounded shrink-0 border ${gitlabStatusTagClasses(gitlabChecks.testsOk)}`}
      >
        {`🧪 ${t('sidebar.releasesTab.gitlabTests', { value: gitlabChecks.testsValue })}`}
      </span>
    </div>
  );
}
