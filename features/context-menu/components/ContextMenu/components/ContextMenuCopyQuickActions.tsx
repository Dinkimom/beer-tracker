'use client';

import type { TrackerWebUrlContext } from '@/lib/issueTrackerProvider/issueTrackerUi';
import type { Task } from '@/types';

import { Button } from '@/components/Button';
import { CopyFeedbackGlyph } from '@/components/CopyFeedbackGlyph';
import { useI18n } from '@/contexts/LanguageContext';
import { ContextMenuGitlabLogoIcon } from '@/features/context-menu/components/ContextMenuGitlabLogoIcon';
import { MENU_QUICK_ACTION, MENU_QUICK_ACTION_LABEL } from '@/features/context-menu/contextMenuClasses';
import {
  getTaskMergeRequestUrl,
  getTaskTrackerDisplayKey,
  getTaskTrackerIssueUrl,
} from '@/features/task/utils/taskUtils';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';

interface ContextMenuCopyQuickActionsProps {
  task: Task;
  tracker: TrackerWebUrlContext;
}

export function ContextMenuCopyQuickActions({ task, tracker }: ContextMenuCopyQuickActionsProps) {
  const { t } = useI18n();
  const keyCopyFeedback = useCopyFeedback();
  const mrCopyFeedback = useCopyFeedback();
  const linkCopyFeedback = useCopyFeedback();
  const mergeRequestUrl = getTaskMergeRequestUrl(task);

  return (
    <>
      <Button
        aria-label={t('sprintPlanner.contextMenu.copyKey')}
        className={MENU_QUICK_ACTION}
        title={t('sprintPlanner.contextMenu.copyKey')}
        type="button"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          keyCopyFeedback.copy(getTaskTrackerDisplayKey(task)).catch(() => undefined);
        }}
      >
        <CopyFeedbackGlyph copied={keyCopyFeedback.copied} idleName="copy" />
        <span className={MENU_QUICK_ACTION_LABEL}>{t('sprintPlanner.contextMenu.copyKeyShort')}</span>
      </Button>
      <Button
        aria-label={
          mergeRequestUrl
            ? t('sprintPlanner.contextMenu.copyMr')
            : t('sprintPlanner.contextMenu.copyMrMissing')
        }
        className={`${MENU_QUICK_ACTION} disabled:!opacity-40`}
        disabled={!mergeRequestUrl}
        title={
          mergeRequestUrl
            ? t('sprintPlanner.contextMenu.copyMr')
            : t('sprintPlanner.contextMenu.copyMrMissing')
        }
        type="button"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          if (!mergeRequestUrl) {
            return;
          }
          mrCopyFeedback.copy(mergeRequestUrl).catch(() => undefined);
        }}
      >
        <CopyFeedbackGlyph
          copied={mrCopyFeedback.copied}
          idle={
            <ContextMenuGitlabLogoIcon className="h-full w-full scale-125 transform-gpu text-current" />
          }
        />
        <span className={MENU_QUICK_ACTION_LABEL}>{t('sprintPlanner.contextMenu.copyMrShort')}</span>
      </Button>
      <Button
        aria-label={t('sprintPlanner.contextMenu.copyLinkAria')}
        className={MENU_QUICK_ACTION}
        title={t('sprintPlanner.contextMenu.copyLink')}
        type="button"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          linkCopyFeedback.copy(getTaskTrackerIssueUrl(task, tracker)).catch(() => undefined);
        }}
      >
        <CopyFeedbackGlyph copied={linkCopyFeedback.copied} idleName="link" />
        <span className={MENU_QUICK_ACTION_LABEL}>{t('sprintPlanner.contextMenu.copyLinkShort')}</span>
      </Button>
    </>
  );
}
