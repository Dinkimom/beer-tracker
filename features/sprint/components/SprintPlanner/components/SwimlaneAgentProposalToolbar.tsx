'use client';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { CONTEXT_MENU_GHOST_BUTTON_RESET, FLOATING_MENU_SHELL } from '@/features/context-menu/contextMenuClasses';

interface SwimlaneAgentProposalToolbarProps {
  pendingCommentIds: readonly string[];
  onApproveAll: (commentIds: readonly string[]) => void;
  onRejectAll: (commentIds: readonly string[]) => void;
}

const ACTION_CLASS = `${CONTEXT_MENU_GHOST_BUTTON_RESET} !h-6 !min-h-0 !gap-1.5 !rounded-md !px-2 !py-0 text-xs font-medium`;

export function SwimlaneAgentProposalToolbar({
  pendingCommentIds,
  onApproveAll,
  onRejectAll,
}: SwimlaneAgentProposalToolbarProps) {
  const { t } = useI18n();
  if (pendingCommentIds.length === 0) {
    return null;
  }
  return (
    <div
      aria-label={t('comments.agentProposalAria')}
      className={`pointer-events-auto flex items-center gap-0.5 px-1 py-1 ${FLOATING_MENU_SHELL}`}
      data-agent-proposal-toolbar=""
      role="toolbar"
    >
      <span
        className={`${CONTEXT_MENU_GHOST_BUTTON_RESET} inline-flex h-6 items-center gap-1.5 px-2 text-xs font-medium text-gray-700 dark:text-gray-300`}
      >
        <Icon className="h-3.5 w-3.5" name="sparkles" />
        {t('comments.agentDraft')}
      </span>
      <Button
        aria-label={t('comments.agentApproveAll')}
        className={`${ACTION_CLASS} text-green-700 hover:!bg-green-500/[0.12] dark:text-green-400 dark:hover:!bg-green-400/[0.12]`}
        title={t('comments.agentApproveAll')}
        type="button"
        variant="ghost"
        onClick={() => onApproveAll(pendingCommentIds)}
      >
        <Icon className="h-3.5 w-3.5" name="check" />
        <span>{t('comments.agentApproveAll')}</span>
      </Button>
      <Button
        aria-label={t('comments.agentRejectAll')}
        className={`${ACTION_CLASS} text-red-600 hover:!bg-red-500/[0.1] dark:text-red-400 dark:hover:!bg-red-400/[0.1]`}
        title={t('comments.agentRejectAll')}
        type="button"
        variant="ghost"
        onClick={() => onRejectAll(pendingCommentIds)}
      >
        <Icon className="h-3.5 w-3.5" name="x" />
        <span>{t('comments.agentRejectAll')}</span>
      </Button>
    </div>
  );
}
