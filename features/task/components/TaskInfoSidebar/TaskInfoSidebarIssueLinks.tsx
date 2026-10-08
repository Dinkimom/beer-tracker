'use client';

import { useConfirmDialog } from '@/components/ConfirmDialog';
import {
  useIssueTrackerProviderCapabilities,
} from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { TaskInfoSidebarIssueLinkRow } from '@/features/task/components/TaskInfoSidebar/TaskInfoSidebarIssueLinkRow';
import { TaskInfoSidebarIssueLinksAddForm } from '@/features/task/components/TaskInfoSidebar/TaskInfoSidebarIssueLinksAddForm';
import {
  groupIssueLinksByRelationship,
  issueLinkRelationshipI18nKey,
} from '@/features/task/components/TaskInfoSidebar/taskInfoSidebarIssueLinksHelpers';
import { useTaskInfoSidebarIssueLinks } from '@/features/task/components/TaskInfoSidebar/useTaskInfoSidebarIssueLinks';

interface TaskInfoSidebarIssueLinksProps {
  issueKey: string;
}

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export function TaskInfoSidebarIssueLinks({ issueKey }: TaskInfoSidebarIssueLinksProps) {
  const { t } = useI18n();
  const { supportsIssueLinks } = useIssueTrackerProviderCapabilities();
  const { confirm, DialogComponent } = useConfirmDialog();

  const {
    createError,
    createLink,
    deleteLink,
    fromCache,
    isCreating,
    isDeleting,
    isLoading,
    links,
  } = useTaskInfoSidebarIssueLinks(issueKey, supportsIssueLinks);

  if (!supportsIssueLinks) {
    return null;
  }

  const groups = groupIssueLinksByRelationship(links);

  const handleDelete = async (linkId: string) => {
    const confirmed = await confirm(t('sprintPlanner.taskInfo.issueLinks.removeConfirm'), {
      title: t('sprintPlanner.taskInfo.issueLinks.removeTitle'),
      confirmText: t('sprintPlanner.taskInfo.issueLinks.removeConfirmAction'),
      cancelText: t('sprintPlanner.taskInfo.issueLinks.removeCancelAction'),
      variant: 'destructive',
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteLink(linkId);
    } catch {
      // Ошибка остаётся в deleteMutation; список не меняется.
    }
  };

  return (
    <section className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('sprintPlanner.taskInfo.issueLinks.title')}
        </h3>
        {fromCache ? (
          <span className="text-xs text-amber-700 dark:text-amber-300">
            {t('sprintPlanner.taskInfo.issueLinks.staleCache')}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('sprintPlanner.taskInfo.issueLinks.loading')}
        </p>
      ) : null}

      {!isLoading && groups.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('sprintPlanner.taskInfo.issueLinks.empty')}
        </p>
      ) : null}

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.relationship}>
            <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t(issueLinkRelationshipI18nKey(group.relationship))}
            </h4>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700/80">
              {group.links.map((link) => (
                <TaskInfoSidebarIssueLinkRow
                  key={link.id}
                  deleting={isDeleting}
                  link={link}
                  onDelete={(id) => void handleDelete(id)}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <TaskInfoSidebarIssueLinksAddForm
        disabled={isCreating}
        errorMessage={
          createError
            ? mutationErrorMessage(
                createError,
                t('sprintPlanner.taskInfo.issueLinks.addFailed')
              )
            : null
        }
        onSubmit={async (payload) => {
          await createLink(payload);
        }}
      />

      {DialogComponent}
    </section>
  );
}
