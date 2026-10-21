'use client';

import { observer } from 'mobx-react-lite';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { JiraToolIcon } from '@/components/JiraToolIcon';
import { YandexTrackerToolIcon } from '@/components/YandexTrackerToolIcon';
import { useIssueTrackerProviderKind } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { StickyNoteToolIcon } from '@/features/comments/components/StickyNoteToolIcon';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  FLOATING_MENU_SHELL,
  FLOATING_TOOLBAR_GLASS,
  FLOATING_TOOLBAR_ITEM_IDLE,
  FLOATING_TOOLBAR_ITEM_ON,
} from '@/features/context-menu/contextMenuClasses';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import { isJiraProviderKind } from '@/lib/issueTrackerProvider/types';
import { useRootStore } from '@/lib/layers';

const ITEM_CLASS = `${CONTEXT_MENU_GHOST_BUTTON_RESET} !h-8 !min-h-0 !gap-1.5 !rounded-md !px-2.5 !py-0 text-sm`;

interface SprintMovePlacementToolbarProps {
  onCancel: () => void;
  onConfirm: () => void;
  onFocusCard: () => void;
}

/** Панель режима «Запланировать в другом спринте»: вместо панели черновика Автоплана. */
export const SprintMovePlacementToolbar = observer(function SprintMovePlacementToolbar({
  onCancel,
  onConfirm,
  onFocusCard,
}: SprintMovePlacementToolbarProps) {
  const { t } = useI18n();
  const isDark = useDocumentDarkClass();
  const issueTrackerKind = useIssueTrackerProviderKind();
  const { sprintMovePlacement, taskPositions } = useRootStore();
  const session = sprintMovePlacement.session;
  if (!session || !sprintMovePlacement.staged) {
    return null;
  }
  const isComment = session.kind === 'comment';
  const placed = isComment || taskPositions.positions.has(session.task.id);
  const { saving } = sprintMovePlacement;
  let glyph = <YandexTrackerToolIcon className="h-4 w-4 shrink-0" />;
  if (isComment) {
    glyph = (
      <StickyNoteToolIcon
        className="h-4 w-4 shrink-0"
        color={session.comment.color}
        isDark={isDark}
        variant="filled"
      />
    );
  } else if (isJiraProviderKind(issueTrackerKind)) {
    glyph = <JiraToolIcon className="h-4 w-4 shrink-0" />;
  }

  return (
    <div
      aria-label={t('sprintPlanner.swimlane.movePlacement.aria')}
      className={`pointer-events-auto flex items-center gap-0.5 p-1 ${FLOATING_MENU_SHELL} ${FLOATING_TOOLBAR_GLASS}`}
      role="toolbar"
    >
      <Button
        className={`${ITEM_CLASS} min-w-0 ${FLOATING_TOOLBAR_ITEM_IDLE}`}
        disabled={!placed}
        title={t('sprintPlanner.swimlane.movePlacement.showOnBoard')}
        type="button"
        variant="ghost"
        onClick={onFocusCard}
      >
        {glyph}
        <span className="shrink-0 font-semibold text-gray-900 dark:text-gray-100">
          {isComment ? t('sprintPlanner.swimlane.movePlacement.noteChip') : session.task.id}
        </span>
        <span className="truncate font-normal text-gray-500 dark:text-gray-400">
          {t('sprintPlanner.swimlane.movePlacement.target', { name: session.targetSprintName })}
        </span>
      </Button>
      {placed ? null : (
        <span className="truncate px-1 text-xs text-amber-700 dark:text-amber-400">
          {t('sprintPlanner.swimlane.movePlacement.hintPlace')}
        </span>
      )}
      <div aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-black/10 dark:bg-white/15" />
      <Button
        className={`${ITEM_CLASS} font-medium ${FLOATING_TOOLBAR_ITEM_ON}`}
        disabled={saving || !placed}
        type="button"
        variant="ghost"
        onClick={onConfirm}
      >
        <Icon
          aria-hidden
          className={`h-4 w-4 shrink-0 ${saving ? 'animate-spin' : ''}`}
          name={saving ? 'spinner' : 'check'}
        />
        {isComment
          ? t('sprintPlanner.swimlane.movePlacement.done')
          : t('sprintPlanner.swimlane.movePlacement.confirm')}
      </Button>
      <Button
        className={`${ITEM_CLASS} ${FLOATING_TOOLBAR_ITEM_IDLE}`}
        disabled={saving}
        type="button"
        variant="ghost"
        onClick={onCancel}
      >
        {t('sprintPlanner.swimlane.movePlacement.cancel')}
      </Button>
    </div>
  );
});
