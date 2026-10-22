'use client';

import type { TrackerWebUrlContext } from '@/lib/issueTrackerProvider/issueTrackerUi';
import type { Task } from '@/types';

import { useI18n } from '@/contexts/LanguageContext';
import { ContextMenuGitlabLogoIcon } from '@/features/context-menu/components/ContextMenuGitlabLogoIcon';
import {
  getTaskMergeRequestUrl,
  getTaskTrackerDisplayKey,
  getTaskTrackerIssueUrl,
} from '@/features/task/utils/taskUtils';
import { issueTrackerI18nParams } from '@/lib/issueTrackerProvider/issueTrackerUi';

import { ContextMenuCopyQuickAction } from './ContextMenuCopyQuickAction';

interface ContextMenuCopyQuickActionsProps {
  task: Task;
  tracker: TrackerWebUrlContext;
}

export function ContextMenuCopyQuickActions({ task, tracker }: ContextMenuCopyQuickActionsProps) {
  const { t } = useI18n();

  return (
    <>
      <ContextMenuCopyQuickAction
        ariaLabel={t('sprintPlanner.contextMenu.copyKey')}
        idleName="copy"
        label={t('sprintPlanner.contextMenu.copyKeyShort')}
        title={t('sprintPlanner.contextMenu.copyKey')}
        value={getTaskTrackerDisplayKey(task)}
      />
      <ContextMenuCopyQuickAction
        ariaLabel={t('sprintPlanner.contextMenu.copyMr')}
        idle={
          <ContextMenuGitlabLogoIcon className="h-full w-full scale-125 transform-gpu text-current" />
        }
        label={t('sprintPlanner.contextMenu.copyMrShort')}
        missingTitle={t('sprintPlanner.contextMenu.copyMrMissing')}
        title={t('sprintPlanner.contextMenu.copyMr')}
        value={getTaskMergeRequestUrl(task) ?? null}
      />
      <ContextMenuCopyQuickAction
        ariaLabel={t('sprintPlanner.contextMenu.copyLinkAria', { ...issueTrackerI18nParams(t, tracker.kind) })}
        idleName="link"
        label={t('sprintPlanner.contextMenu.copyLinkShort')}
        title={t('sprintPlanner.contextMenu.copyLink')}
        value={getTaskTrackerIssueUrl(task, tracker)}
      />
    </>
  );
}
