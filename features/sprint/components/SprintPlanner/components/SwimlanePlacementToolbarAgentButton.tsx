'use client';

import type { AgentSessionStatus } from '@/lib/agentSessions/agentSession';
import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

import { McpOAuthClientMark } from '@/app/mcp/oauth/consent/McpOAuthClientMark';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  FLOATING_TOOLBAR_ITEM_ON,
  FLOATING_TOOLBAR_ITEM_IDLE,
} from '@/features/context-menu/contextMenuClasses';

import { PlannerShortcutTooltip } from './PlannerShortcutTooltip';

const DOT_CLASS: Record<AgentSessionStatus, string> = {
  closed: 'bg-gray-400',
  waiting_agent: 'bg-amber-500',
  waiting_user: 'bg-blue-500',
};

/**
 * Агент в капсуле свимлейна — единственный вход в чат: открывает и сворачивает его, открыт —
 * нажата. Без сессии чат пишет новую просьбу про спринт, с сессией — показывает её; новая сессия —
 * в шапке чата. Точка — чья очередь в активной сессии, число — 💬 без ответа агента.
 * Вместо ✨ — значок того, кто ответит (Claude, Cursor…), если он известен.
 */
export function SwimlanePlacementToolbarAgentButton({
  brand,
  open,
  openComments,
  status,
  onClick,
}: {
  /** Клиент агента; null — общий ✨. */
  brand: McpOAuthClientBrand | null;
  open: boolean;
  openComments: number;
  /** Статус активной сессии; нет — сессии нет. */
  status?: AgentSessionStatus;
  onClick: () => void;
}) {
  const { t } = useI18n();
  let label = status ? t('agentSession.chatAria') : t('agentSession.toolbarAria');
  if (open) {
    label = t('agentSession.collapseChat');
  }
  return (
    <>
      <div aria-hidden className="mx-1 h-6 w-px shrink-0 self-center bg-gray-200 dark:bg-gray-600" />
      <PlannerShortcutTooltip label={label} shortcut="" side="top">
        <Button
          aria-expanded={open}
          aria-label={label}
          className={`relative !h-9 !w-9 !min-h-0 !min-w-0 !gap-0 !rounded-lg !px-0 !py-0 ${CONTEXT_MENU_GHOST_BUTTON_RESET} ${open ? FLOATING_TOOLBAR_ITEM_ON : FLOATING_TOOLBAR_ITEM_IDLE}`}
          data-agent-session-chat-trigger=""
          data-swimlane-ask-agent=""
          type="button"
          variant="ghost"
          onClick={onClick}
        >
          {brand ? (
            <McpOAuthClientMark brand={brand} label={label} size="toolbar" />
          ) : (
            <Icon className="h-4 w-4 shrink-0" name="sparkles" />
          )}
          {status && openComments === 0 ? (
            <span
              aria-hidden
              className={`absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ring-white dark:ring-gray-800 ${DOT_CLASS[status]}`}
            />
          ) : null}
          {openComments > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-4 text-white">
              {openComments}
            </span>
          ) : null}
        </Button>
      </PlannerShortcutTooltip>
    </>
  );
}
