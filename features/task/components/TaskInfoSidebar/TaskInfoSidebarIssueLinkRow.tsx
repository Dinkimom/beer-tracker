'use client';

import type { IssueTrackerIssueLink } from '@/lib/issueTrackerProvider/issueLinkTypes';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { useTrackerWebUrlContext } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { TASK_INFO_ICON_BUTTON_CLASS } from '@/features/task/components/TaskInfoSidebar/taskInfoSidebarIconClasses';
import { getTrackerIssueUrlByKey } from '@/features/task/utils/taskUtils';

interface TaskInfoSidebarIssueLinkRowProps {
  deleting: boolean;
  link: IssueTrackerIssueLink;
  onDelete: (linkId: string) => void;
}

export function TaskInfoSidebarIssueLinkRow({
  deleting,
  link,
  onDelete,
}: TaskInfoSidebarIssueLinkRowProps) {
  const { t } = useI18n();
  const tracker = useTrackerWebUrlContext();
  const href = getTrackerIssueUrlByKey(link.linkedIssueKey, tracker);
  const summary = link.linkedSummary?.trim() || '';
  const status = link.linkedStatus?.trim() || '';

  return (
    <li className="flex items-start gap-2 rounded-md px-1 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <a
            className="shrink-0 font-medium text-blue-600 hover:underline dark:text-blue-400"
            href={href || undefined}
            rel="noopener noreferrer"
            target="_blank"
          >
            {link.linkedIssueKey}
          </a>
          {status ? (
            <span className="truncate text-xs text-gray-500 dark:text-gray-400">{status}</span>
          ) : null}
        </div>
        {summary ? (
          <p className="mt-0.5 truncate text-sm text-gray-700 dark:text-gray-200">{summary}</p>
        ) : null}
      </div>
      <TextTooltip content={t('sprintPlanner.taskInfo.issueLinks.deleteAria')}>
        <button
          aria-label={t('sprintPlanner.taskInfo.issueLinks.deleteAria')}
          className={`${TASK_INFO_ICON_BUTTON_CLASS} text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300`}
          disabled={deleting}
          type="button"
          onClick={() => onDelete(link.id)}
        >
          <Icon className="h-4 w-4" name="trash" />
        </button>
      </TextTooltip>
    </li>
  );
}
