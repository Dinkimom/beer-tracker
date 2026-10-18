'use client';

import { McpOAuthClientMark } from '@/app/mcp/oauth/consent/McpOAuthClientMark';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  FLOATING_MENU_SHELL,
  FLOATING_TOOLBAR_GLASS,
} from '@/features/context-menu/contextMenuClasses';
import { mcpOAuthClientBrandName, type McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

interface SwimlaneAgentProposalToolbarProps {
  clientBrand?: McpOAuthClientBrand;
  goalPreviewCount?: number;
  pendingCommentIds: readonly string[];
  positionPreviewCount?: number;
  onApproveAll: (commentIds: readonly string[]) => void;
  onRejectAll: (commentIds: readonly string[]) => void;
}

const ACTION_CLASS = `${CONTEXT_MENU_GHOST_BUTTON_RESET} !h-6 !min-h-0 !gap-1.5 !rounded-md !px-2 !py-0 text-xs font-medium`;

export function SwimlaneAgentProposalToolbar({
  clientBrand,
  goalPreviewCount = 0,
  pendingCommentIds,
  positionPreviewCount = 0,
  onApproveAll,
  onRejectAll,
}: SwimlaneAgentProposalToolbarProps) {
  const { t } = useI18n();
  if (pendingCommentIds.length === 0 && positionPreviewCount === 0 && goalPreviewCount === 0) {
    return null;
  }
  const agentName = clientBrand ? mcpOAuthClientBrandName(clientBrand) : null;
  const label = agentName ?? t('comments.agentDraft');
  return (
    <div
      aria-label={t('comments.agentProposalAria')}
      className={`pointer-events-auto flex items-center gap-0.5 px-1 py-1 ${FLOATING_MENU_SHELL} ${FLOATING_TOOLBAR_GLASS}`}
      data-agent-proposal-toolbar=""
      role="toolbar"
    >
      <span
        className={`${CONTEXT_MENU_GHOST_BUTTON_RESET} inline-flex h-6 items-center gap-1.5 px-2 text-xs font-medium text-gray-700 dark:text-gray-300`}
      >
        {clientBrand && agentName ? (
          <McpOAuthClientMark brand={clientBrand} compact label={label} />
        ) : (
          <Icon className="h-3.5 w-3.5" name="sparkles" />
        )}
        {label}
      </span>
      <Button
        aria-label={t('comments.agentApproveAll')}
        className={`${ACTION_CLASS} text-green-700 hover:!bg-green-500/[0.12] dark:text-green-400 dark:hover:!bg-green-400/[0.12]`}
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
