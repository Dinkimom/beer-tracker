'use client';

import type { TrackerWebUrlContext } from '@/lib/issueTrackerProvider/issueTrackerUi';
import type { Task } from '@/types';

import { Button } from '@/components/Button';
import { CopyFeedbackGlyph } from '@/components/CopyFeedbackGlyph';
import { useI18n } from '@/contexts/LanguageContext';
import { ContextMenuGitlabLogoIcon } from '@/features/context-menu/components/ContextMenuGitlabLogoIcon';
import {
  getTaskMergeRequestUrl,
  getTaskTrackerDisplayKey,
  getTaskTrackerIssueUrl,
} from '@/features/task/utils/taskUtils';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';

const QUICK_ACTION_BUTTON_CLASS =
  'inline-flex min-h-11 min-w-[52px] flex-col gap-0.5 border-0 bg-transparent px-1.5 py-1 text-gray-500 shadow-none hover:!bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:!bg-gray-700 dark:hover:text-gray-100';

const QUICK_ACTION_LABEL_CLASS =
  'max-w-[4.5rem] truncate text-center text-[10px] font-medium leading-tight text-gray-500 dark:text-gray-400';

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
        className={QUICK_ACTION_BUTTON_CLASS}
        title={t('sprintPlanner.contextMenu.copyKey')}
        type="button"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          keyCopyFeedback.copy(getTaskTrackerDisplayKey(task)).catch(() => undefined);
        }}
      >
        <CopyFeedbackGlyph copied={keyCopyFeedback.copied} idleName="copy" />
        <span className={QUICK_ACTION_LABEL_CLASS}>{t('sprintPlanner.contextMenu.copyKeyShort')}</span>
      </Button>
      <Button
        aria-label={
          mergeRequestUrl
            ? t('sprintPlanner.contextMenu.copyMr')
            : t('sprintPlanner.contextMenu.copyMrMissing')
        }
        className={`${QUICK_ACTION_BUTTON_CLASS} disabled:opacity-40`}
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
        <span className={QUICK_ACTION_LABEL_CLASS}>{t('sprintPlanner.contextMenu.copyMrShort')}</span>
      </Button>
      <Button
        aria-label={t('sprintPlanner.contextMenu.copyLinkAria')}
        className={QUICK_ACTION_BUTTON_CLASS}
        title={t('sprintPlanner.contextMenu.copyLink')}
        type="button"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          linkCopyFeedback.copy(getTaskTrackerIssueUrl(task, tracker)).catch(() => undefined);
        }}
      >
        <CopyFeedbackGlyph copied={linkCopyFeedback.copied} idleName="link" />
        <span className={QUICK_ACTION_LABEL_CLASS}>{t('sprintPlanner.contextMenu.copyLinkShort')}</span>
      </Button>
    </>
  );
}
