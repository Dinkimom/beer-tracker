'use client';

import type { AgentIslandChat } from '../hooks/useAgentIslandChat';

import { observer } from 'mobx-react-lite';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  FLOATING_MENU_SHELL,
  FLOATING_TOOLBAR_GLASS,
} from '@/features/context-menu/contextMenuClasses';

import { AgentPendingNavigator } from './AgentPendingNavigator';
import { AgentSessionChat } from './AgentSessionChat';

interface SwimlaneAgentProposalToolbarProps {
  goalPreviewCount?: number;
  /** Драфт агента ждёт решения на доске. */
  hasPendingDraft: boolean;
  /** Состояние чата; открывает его ✨ в тулбаре инструментов. */
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

const SHELL_CLASS = `!rounded-xl ${FLOATING_MENU_SHELL} ${FLOATING_TOOLBAR_GLASS}`;

/**
 * Остров агента над тулбаром инструментов: карточка чата (со списком сессий) и строка ревью драфта «‹ 1/2 › ✓ ✗».
 * Строка — только пока драфт ждёт решения на доске. Чат открывают ✨ в тулбаре и «Агенту» в меню
 * задачи / заметки; сворачивают ✨, клик мимо острова и смена режима в тулбаре.
 */
export const SwimlaneAgentProposalToolbar = observer(function SwimlaneAgentProposalToolbar({
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
  const { panel, sessions } = island;

  if (!panel && !hasPendingDraft) {
    return null;
  }
  const pendingTotal = positionPreviewCount + goalPreviewCount + pendingCommentIds.length;

  return (
    <div
      ref={island.islandRef}
      aria-label={t('comments.agentProposalAria')}
      // Во всю ширину колонки — она по тулбару инструментов: чат над ним той же ширины.
      className="pointer-events-auto relative self-stretch"
      data-agent-proposal-toolbar=""
    >
      {panel && sprintId != null ? (
        // Ширина — как у тулбара инструментов, но не уже 30rem (в режиме «По фичам» тулбар короче).
        <div className="absolute bottom-full left-1/2 mb-2 w-[max(100%,min(100vw-2rem,30rem))] -translate-x-1/2">
          <div className={`agent-island-chat-panel p-3 ${SHELL_CLASS}`} data-state={island.panelState}>
            <AgentSessionChat
              // Своя сессия — свой черновик: набранное для одной сессии не уезжает в другую.
              key={`${panel.chat.key}:${panel.session?.id ?? 'new'}`}
              autoFocus
              dev={panel.chat.dev}
              origin={panel.chat.origin}
              session={panel.session}
              sessionList={{
                draftSessionId: sessions.draftSession?.id ?? null,
                open: island.listOpen,
                sessions: sessions.openSessions,
                unread: island.unread,
                onPick: island.openSession,
                onToggle: island.toggleList,
              }}
              sprintId={sprintId}
              onClear={island.clearChat}
              onContextRemove={island.removeContext}
              onContextSent={island.clearContext}
              onCreated={island.selectCreated}
              onStartDev={island.startDev}
            />
          </div>
        </div>
      ) : null}
      {hasPendingDraft ? (
        <div className={`mx-auto flex w-fit items-center justify-center gap-0.5 px-1 py-1 ${SHELL_CLASS}`} role="toolbar">
          <AgentPendingNavigator
            total={pendingTotal}
            onRevealHidden={goalPreviewCount > 0 ? onRevealGoals : undefined}
          />
          <Button
            aria-label={t('comments.agentApproveAll')}
            className={`${ACTION_CLASS} text-green-700 hover:!bg-green-500/[0.12] dark:text-green-400 dark:hover:!bg-green-400/[0.12]`}
            type="button"
            variant="ghost"
            onClick={() => {
              onApproveAll(pendingCommentIds);
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
        </div>
      ) : null}
    </div>
  );
});
