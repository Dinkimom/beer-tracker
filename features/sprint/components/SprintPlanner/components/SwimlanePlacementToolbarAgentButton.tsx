'use client';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  FLOATING_TOOLBAR_ITEM_ON,
  FLOATING_TOOLBAR_ITEM_IDLE,
} from '@/features/context-menu/contextMenuClasses';

import { PlannerShortcutTooltip } from './PlannerShortcutTooltip';

/**
 * Агент в капсуле свимлейна. Без сессии — ✨ «Агенту»: просьба про спринт целиком. Есть
 * активная сессия — «Новая сессия» (нажата, пока пишем новую; повторно — назад к текущей):
 * ✨ сменил бы цель открытого чата и стёр набранное, а к текущей сессии ведёт «Чат» острова.
 */
export function SwimlanePlacementToolbarAgentButton({
  newSession,
  onClick,
}: {
  /** `null` — сессии нет, кнопка открывает чат про спринт. */
  newSession: { selected: boolean } | null;
  onClick: () => void;
}) {
  const { t } = useI18n();
  let label = t('agentSession.toolbarAria');
  if (newSession) {
    label = newSession.selected ? t('agentSession.backToSession') : t('agentSession.newSession');
  }
  return (
    <>
      <div aria-hidden className="mx-1 h-6 w-px shrink-0 self-center bg-gray-200 dark:bg-gray-600" />
      <PlannerShortcutTooltip label={label} shortcut="" side="top">
        <Button
          aria-label={label}
          aria-pressed={newSession ? newSession.selected : undefined}
          className={`!h-9 !w-9 !min-h-0 !min-w-0 !gap-0 !rounded-lg !px-0 !py-0 ${CONTEXT_MENU_GHOST_BUTTON_RESET} ${newSession?.selected ? FLOATING_TOOLBAR_ITEM_ON : FLOATING_TOOLBAR_ITEM_IDLE}`}
          data-agent-session-new={newSession ? '' : undefined}
          data-swimlane-ask-agent=""
          type="button"
          variant="ghost"
          onClick={onClick}
        >
          <Icon className="h-4 w-4 shrink-0" name={newSession ? 'comment-plus' : 'sparkles'} />
        </Button>
      </PlannerShortcutTooltip>
    </>
  );
}
