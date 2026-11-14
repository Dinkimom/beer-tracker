'use client';

import type { AgentSessionScope } from '@/lib/agentSessions/agentSessionScope';

import { useState } from 'react';

import { ZIndex } from '@/constants';
import { FLOATING_MENU_SHELL, FLOATING_TOOLBAR_GLASS } from '@/features/context-menu/contextMenuClasses';
import { AgentSessionChat } from '@/features/sprint/components/SprintPlanner/components/AgentSessionChat';
import { SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX } from '@/features/sprint/components/SprintPlanner/utils/swimlanePlacementToolbar';
import { useAgentSessions } from '@/features/swimlane/hooks/useAgentSessions';

/** Над тулбаром и плашкой черновика. */
const ABOVE_TOOLBAR_PX = SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX + 104;
const NO_UNREAD: ReadonlySet<string> = new Set();

interface QuarterlyPlanAgentChatProps {
  scope: AgentSessionScope;
}

/**
 * Чат с агентом по квартальному плану (QM11) — тот же `AgentSessionChat`, что на доске спринта, в том же острове.
 * Какую сессию показать, решает сам: сначала сессию черновика, иначе свежую открытую. Без упоминаний задач
 * и сценариев — они про спринт.
 */
export function QuarterlyPlanAgentChat({ scope }: QuarterlyPlanAgentChatProps) {
  const sessions = useAgentSessions(scope);
  const [pick, setPick] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const fallback = sessions.draftSession ?? sessions.openSessions[0] ?? null;
  const session =
    pick === 'new' ? null : (sessions.sessions.find((item) => item.id === pick) ?? fallback);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 flex justify-center"
      style={{ bottom: ABOVE_TOOLBAR_PX, zIndex: ZIndex.floatingControls }}
    >
      <div
        className={`agent-island-chat-panel pointer-events-auto w-[min(100vw-2rem,30rem)] p-3 !rounded-xl ${FLOATING_MENU_SHELL} ${FLOATING_TOOLBAR_GLASS}`}
        data-state="open"
      >
        <AgentSessionChat
          // Своя сессия — свой черновик: набранное для одной сессии не уезжает в другую.
          key={session?.id ?? 'new'}
          autoFocus
          scope={scope}
          session={session}
          sessionList={{
            draftSessionId: sessions.draftSession?.id ?? null,
            open: listOpen,
            sessions: sessions.openSessions,
            unread: NO_UNREAD,
            onPick: (sessionId) => {
              setPick(sessionId);
              setListOpen(false);
            },
            onToggle: () => setListOpen((open) => !open),
          }}
          onClear={() => {
            if (session) sessions.close(session.id).catch(() => undefined);
            setPick('new');
          }}
          onContextRemove={() => undefined}
          onContextSent={() => undefined}
          onCreated={setPick}
          onStartDev={() => undefined}
        />
      </div>
    </div>
  );
}
