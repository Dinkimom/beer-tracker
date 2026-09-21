'use client';

import type { Task } from '@/types';

import { CopyFeedbackGlyph } from '@/components/CopyFeedbackGlyph';
import { Icon } from '@/components/Icon';
import { useTrackerWebUrlContext } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { resolveTaskInfoBreadcrumbParts } from '@/features/task/components/TaskInfoSidebar/taskInfoSidebarFormatters';
import {
  TASK_INFO_ICON_BUTTON_CLASS,
} from '@/features/task/components/TaskInfoSidebar/taskInfoSidebarIconClasses';
import {
  getTaskTrackerDisplayKey,
  getTaskTrackerIssueUrl,
} from '@/features/task/utils/taskUtils';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';

const BREADCRUMB_MUTED_LINK_CLASS =
  'min-w-0 truncate text-gray-500 hover:underline dark:text-gray-400';

const BREADCRUMB_KEY_CLASS =
  'shrink-0 font-medium text-blue-600 hover:underline dark:text-blue-400';

const BREADCRUMB_SEP_CLASS = 'shrink-0 px-0.5 text-gray-400 dark:text-gray-500';

interface TaskInfoSidebarHeaderProps {
  task: Task;
  onClose: () => void;
}

export function TaskInfoSidebarHeader({ task, onClose }: TaskInfoSidebarHeaderProps) {
  const { t } = useI18n();
  const tracker = useTrackerWebUrlContext();
  const keyCopyFeedback = useCopyFeedback();
  const linkCopyFeedback = useCopyFeedback();

  const issueKey = getTaskTrackerDisplayKey(task);
  const issueUrl = getTaskTrackerIssueUrl(task, tracker);
  const breadcrumb = resolveTaskInfoBreadcrumbParts(task, issueKey, tracker);

  const showQueue = Boolean(breadcrumb.queueLabel && breadcrumb.queueUrl);
  const showParent = Boolean(breadcrumb.parent);

  return (
    <header className="shrink-0 border-b border-gray-200 px-4 py-2.5 dark:border-gray-700">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          {showQueue ? (
            <>
              <a
                className={BREADCRUMB_MUTED_LINK_CLASS}
                href={breadcrumb.queueUrl ?? undefined}
                rel="noopener noreferrer"
                target="_blank"
                title={breadcrumb.queueLabel ?? undefined}
              >
                {breadcrumb.queueLabel}
              </a>
              <span aria-hidden className={BREADCRUMB_SEP_CLASS}>
                /
              </span>
            </>
          ) : null}
          {showParent && breadcrumb.parent ? (
            <>
              <a
                className={BREADCRUMB_MUTED_LINK_CLASS}
                href={breadcrumb.parent.url}
                rel="noopener noreferrer"
                target="_blank"
                title={breadcrumb.parent.label}
              >
                {breadcrumb.parent.label}
              </a>
              <span aria-hidden className={BREADCRUMB_SEP_CLASS}>
                /
              </span>
            </>
          ) : null}
          <a
            className={BREADCRUMB_KEY_CLASS}
            href={issueUrl}
            rel="noopener noreferrer"
            target="_blank"
            title={t('sprintPlanner.taskInfo.openInTracker')}
          >
            {issueKey}
          </a>
          <button
            aria-label={t('sprintPlanner.taskInfo.copyKey')}
            className={TASK_INFO_ICON_BUTTON_CLASS}
            title={t('sprintPlanner.taskInfo.copyKey')}
            type="button"
            onClick={() => {
              keyCopyFeedback.copy(issueKey).catch(() => undefined);
            }}
          >
            <CopyFeedbackGlyph copied={keyCopyFeedback.copied} idleName="copy" />
          </button>
          <button
            aria-label={t('sprintPlanner.taskInfo.copyLink')}
            className={TASK_INFO_ICON_BUTTON_CLASS}
            title={t('sprintPlanner.taskInfo.copyLink')}
            type="button"
            onClick={() => {
              linkCopyFeedback.copy(issueUrl).catch(() => undefined);
            }}
          >
            <CopyFeedbackGlyph copied={linkCopyFeedback.copied} idleName="link" />
          </button>
        </div>

        <button
          aria-label={t('sprintPlanner.taskInfo.close')}
          className={TASK_INFO_ICON_BUTTON_CLASS}
          title={t('sprintPlanner.taskInfo.close')}
          type="button"
          onClick={onClose}
        >
          <Icon className="h-5 w-5 shrink-0 text-current" name="x-bold" />
        </button>
      </div>
    </header>
  );
}
