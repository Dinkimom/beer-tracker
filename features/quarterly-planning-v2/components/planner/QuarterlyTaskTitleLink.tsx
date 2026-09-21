'use client';

import type { MouseEvent } from 'react';

import { IssueTypeIcon } from '@/components/IssueTypeIcon';
import { useIssueTrackerIssueWebUrl } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';

import { getQuarterlyTaskTitleParts } from './quarterlyTaskTitle';

interface QuarterlyTaskTitleLinkProps {
  className?: string;
  displayKey: string;
  taskName?: string;
  taskType?: string;
}

/** Подпись «тип · KEY · название»: ссылка только на KEY. */
export function QuarterlyTaskTitleLink({
  displayKey,
  taskName,
  taskType,
  className = '',
}: QuarterlyTaskTitleLinkProps) {
  const { t } = useI18n();
  const untitled = t('task.card.untitled');
  const parts = getQuarterlyTaskTitleParts(displayKey, taskName, untitled);
  const issueUrl = useIssueTrackerIssueWebUrl(parts.linkKey ?? '');
  const stopNav = (e: MouseEvent) => e.stopPropagation();
  const wrapperClass = `flex min-w-0 items-center gap-1.5 ${className}`.trim();

  const typeIcon = <IssueTypeIcon className="h-4 w-4 shrink-0" type={taskType} />;

  if (parts.plainText != null) {
    return (
      <span className={wrapperClass}>
        {typeIcon}
        <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">{parts.plainText}</span>
      </span>
    );
  }

  const linkKey = parts.linkKey;
  if (!linkKey) {
    return null;
  }

  return (
    <span className={wrapperClass}>
      {typeIcon}
      <a
        className="shrink-0 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        href={issueUrl}
        rel="noopener noreferrer"
        target="_blank"
        title={t('sprintPlanner.occupancy.openInTracker', { key: linkKey })}
        onClick={stopNav}
      >
        {linkKey}
      </a>
      {parts.title != null ? (
        <>
          <span
            aria-hidden
            className="shrink-0 select-none text-sm text-gray-400 dark:text-gray-500"
          >
            -
          </span>
          <span className="min-w-0 truncate text-sm text-gray-900 dark:text-gray-100">
            {parts.title}
          </span>
        </>
      ) : null}
    </span>
  );
}
