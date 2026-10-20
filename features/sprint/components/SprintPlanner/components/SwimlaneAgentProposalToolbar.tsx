'use client';

import type { AgentIslandChat } from '../hooks/useAgentIslandChat';

import { observer } from 'mobx-react-lite';

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

import { AgentIslandChatToggle } from './AgentIslandChatToggle';
import { AgentPendingNavigator } from './AgentPendingNavigator';
import { AgentSessionChat } from './AgentSessionChat';

interface SwimlaneAgentProposalToolbarProps {
  clientBrand?: McpOAuthClientBrand;
  goalPreviewCount?: number;
  /** Драфт агента ждёт решения на доске. */
  hasPendingDraft: boolean;
  /** Состояние чата; живёт в тулбаре — там же кнопка новой сессии. */
  island: AgentIslandChat;
  pendingCommentIds: readonly string[];
  positionPreviewCount?: number;
  sprintId?: number | null;
  onApproveAll: (commentIds: readonly string[]) => void;
  onRejectAll: (commentIds: readonly string[]) => void;
  /** Открыть сайдбар на целях: без него тулбары превью целей не смонтированы. */
  onRevealGoals?: () => void;
}

const ACTION_CLASS = `${CONTEXT_MENU_GHOST_BUTTON_RESET} !h-6 !min-h-0 !gap-1.5 !rounded-md !px-2 !py-0 text-xs font-medium`;

const CHAT_TOGGLE_CLASS = `${ACTION_CLASS} text-gray-700 hover:!bg-gray-500/[0.12] dark:text-gray-200 dark:hover:!bg-white/[0.08]`;

/** Квадратная иконочная кнопка: без горизонтальных отступов, иначе svg сжимается в 24px. */
const CLOSE_CLASS = `${CONTEXT_MENU_GHOST_BUTTON_RESET} !h-6 !min-h-0 !w-6 !rounded-md !p-0 text-gray-700 hover:!bg-gray-500/[0.12] dark:text-gray-200 dark:hover:!bg-white/[0.08]`;

/** `open` — чат открыт, `closing` — идёт анимация сворачивания, `closed` — одна строка. */
function islandState(chatOpen: boolean, panelMounted: boolean): 'closed' | 'closing' | 'open' {
  if (chatOpen) {
    return 'open';
  }
  return panelMounted ? 'closing' : 'closed';
}

/**
 * Остров агента над тулбаром инструментов. Строка: агент, «‹ 1/2 ›», «Чат», ↻ / ✓ / ✗ по драфту,
 * ✕ завершить. Новая сессия — кнопкой в тулбаре. Клик мимо острова или смена режима в тулбаре
 * сворачивают чат. Развёрнут — сверху чат сессии, а строка та же и по центру: при открытии
 * ничего не сдвигается, «Чат» только становится нажатым. Открывается «Чатом», «Агенту» в меню
 * задачи / заметки и кнопкой агента в тулбаре; виден, пока есть активная сессия, драфт или открыт чат.
 */
export const SwimlaneAgentProposalToolbar = observer(function SwimlaneAgentProposalToolbar({
  clientBrand,
  goalPreviewCount = 0,
  hasPendingDraft,
  island,
  pendingCommentIds,
  positionPreviewCount = 0,
  sprintId = null,
  onApproveAll,
  onRejectAll,
  onRevealGoals,
}: SwimlaneAgentProposalToolbarProps) {
  const { t } = useI18n();
  const { chatOpen, panel, sessions } = island;

  // Без открытого чата остров виден, пока есть активная сессия или драфт: его «Чат» — путь
  // к текущей сессии (кнопка в тулбаре при сессии создаёт новую).
  if (!panel && !hasPendingDraft && !sessions.active) {
    return null;
  }
  const agentName = clientBrand ? mcpOAuthClientBrandName(clientBrand) : null;
  const label = agentName ?? t('comments.agentDraft');
  const pendingTotal = positionPreviewCount + goalPreviewCount + pendingCommentIds.length;

  return (
    <div
      ref={island.islandRef}
      aria-label={t('comments.agentProposalAria')}
      className={`pointer-events-auto flex flex-col !rounded-xl ${FLOATING_MENU_SHELL} ${FLOATING_TOOLBAR_GLASS}`}
      data-agent-island={islandState(chatOpen, panel != null)}
      data-agent-proposal-toolbar=""
    >
      {panel && sprintId != null ? (
        <div
          className="agent-island-chat-panel"
          data-settled={island.panelSettled ? '' : undefined}
          data-state={island.panelState}
          onAnimationEnd={island.onPanelAnimationEnd}
        >
          {/* w-0 + min-w-full: ширину острова задаёт строка (или минимум), а не длинные реплики. */}
          <div className="w-0 min-w-full">
            <div className="p-3 pb-1">
              <AgentSessionChat
                key={panel.chat.key}
                autoFocus
                origin={panel.chat.origin}
                session={panel.session}
                sprintId={sprintId}
                onCreated={island.selectCreated}
              />
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex items-center justify-center gap-0.5 px-1 py-1" role="toolbar">
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
        <AgentPendingNavigator
          total={pendingTotal}
          onRevealHidden={goalPreviewCount > 0 ? onRevealGoals : undefined}
        />
        <AgentIslandChatToggle
          className={CHAT_TOGGLE_CLASS}
          open={chatOpen}
          openComments={sessions.openComments}
          status={sessions.active?.status}
          onToggle={island.toggleChat}
        />
        {island.redoSession ? (
          <Button
            className={`${ACTION_CLASS} text-blue-700 hover:!bg-blue-500/[0.12] disabled:pointer-events-none disabled:opacity-50 dark:text-blue-300 dark:hover:!bg-blue-400/[0.12]`}
            data-agent-session-redo=""
            disabled={sessions.posting}
            title={t('agentSession.redoHint')}
            type="button"
            variant="ghost"
            onClick={island.redo}
          >
            <Icon className="h-3.5 w-3.5" name="refresh" />
            <span>{t('agentSession.redoQuick')}</span>
          </Button>
        ) : null}
        {hasPendingDraft ? (
          <>
            <Button
              aria-label={t('comments.agentApproveAll')}
              className={`${ACTION_CLASS} text-green-700 hover:!bg-green-500/[0.12] dark:text-green-400 dark:hover:!bg-green-400/[0.12]`}
              type="button"
              variant="ghost"
              onClick={() => {
                onApproveAll(pendingCommentIds);
                island.finishDraftSession();
              }}
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
          </>
        ) : null}
        {island.session && island.session.status !== 'closed' ? (
          <>
            <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-gray-300/80 dark:bg-gray-600/80" />
            <Button
              aria-label={t('agentSession.closeSession')}
              className={CLOSE_CLASS}
              data-agent-session-close=""
              title={t('agentSession.closeSession')}
              type="button"
              variant="ghost"
              onClick={island.closeSession}
            >
              <Icon className="h-4 w-4" name="x" />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
});
