'use client';

import type { AgentSessionChatOrigin } from '../utils/agentChatOrigin';
import type { AgentSession } from '@/lib/agentSessions/agentSession';

import { useEffect, useRef, useState } from 'react';

import { useAgentSessions } from '@/features/swimlane/hooks/useAgentSessions';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';
import { useRootStore } from '@/lib/layers';

import { resolveAgentChatOrigin } from '../utils/agentChatOrigin';

const ASK_AGENT_SELECTOR = '[data-swimlane-ask-agent]';

/** Какую сессию показывает чат: 'new' — пишем новую, id — только что созданная; `key` — цель чата. */
interface ChatSessionPick {
  key: string;
  value: string;
}

/** Что рисует панель чата; при сворачивании — последний открытый, пока идёт анимация. */
interface ChatPanel {
  chat: { key: string; origin: AgentSessionChatOrigin };
  session: AgentSession | null;
}

/**
 * Состояние острова агента: открыт ли чат и откуда, какая сессия в нём (текущая / новая /
 * только что созданная), действия — ✨ в тулбаре, новая сессия и 🗑 «Очистить чат» в шапке чата. Выбор
 * сессии сбрасывается при закрытии чата и смене его цели. Вызывать из observer-компонента.
 *
 * Панель чата живёт дольше `chatOpen` на время анимации сворачивания (`panel` + `panelState`).
 * Чат сворачивают Escape, клик мимо острова (`islandRef`) и смена режима в тулбаре инструментов.
 * Сессия закрывается 🗑 «Очистить чат», а ещё сама: после «Принять всё», если агент ничего не ждёт,
 * и при старте новой (прежняя, если её драфт не висит на доске).
 */
export function useAgentIslandChat(sprintId: number | null) {
  const { sprintPlannerUi } = useRootStore();
  const sessions = useAgentSessions(sprintId);
  const target = sprintPlannerUi.agentRequestTarget;
  const chatOpen = target != null && sprintId != null;
  const [pick, setPick] = useState<ChatSessionPick | null>(null);
  const islandRef = useRef<HTMLDivElement>(null);
  const placementTool = sprintPlannerUi.placementTool;
  const placementToolRef = useRef(placementTool);
  // Чат свернули откуда угодно — выбор сессии сбрасываем (setState во время рендера, без эффекта).
  if (!chatOpen && pick) {
    setPick(null);
  }

  useEffect(() => {
    if (!chatOpen) {
      return;
    }
    const collapse = () => {
      setPick(null);
      sprintPlannerUi.setAgentRequestTarget(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        collapse();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const node = event.target;
      // ✨ в тулбаре сам открывает чат — не сворачиваем, чтобы не мигал.
      if (!(node instanceof Element) || islandRef.current?.contains(node) || node.closest(ASK_AGENT_SELECTOR)) {
        return;
      }
      collapse();
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [chatOpen, sprintPlannerUi]);

  // Выбор режима в тулбаре (и хоткеем) сворачивает чат.
  useEffect(() => {
    if (placementToolRef.current === placementTool) {
      return;
    }
    placementToolRef.current = placementTool;
    sprintPlannerUi.setAgentRequestTarget(null);
  }, [placementTool, sprintPlannerUi]);

  const chat = chatOpen ? resolveAgentChatOrigin(target, undefined) : null;
  const chatKey = chat?.key ?? 'session';
  const selected = pick?.key === chatKey ? pick.value : null;
  const session =
    selected === 'new' ? null : (sessions.sessions.find((item) => item.id === selected) ?? sessions.active);

  const presence = useOverlayPresence(chatOpen);
  const [lastPanel, setLastPanel] = useState<ChatPanel | null>(null);
  if (chat && (lastPanel?.chat.key !== chat.key || lastPanel.session !== session)) {
    setLastPanel({ chat, session });
  }
  let panel: ChatPanel | null = null;
  if (chat) {
    panel = { chat, session };
  } else if (presence.mounted) {
    panel = lastPanel;
  }

  return {
    chatOpen,
    islandRef,
    newSelected: chatOpen && selected === 'new',
    panel,
    panelState: presence.state,
    session,
    sessions,
    /** 🗑: завершить показанную сессию — открытый чат остаётся, пустой, под новую просьбу. */
    clearChat: () => {
      if (session) {
        sessions.close(session.id).catch(() => undefined);
      }
      setPick(null);
    },
    /**
     * После «Принять всё»: драфт решён; не закрываем, если человек уже написал агенту ещё.
     * Закрытая сессия перестаёт быть активной — открытый чат держим на ней, иначе переписка
     * пропала бы и на её месте встала пустая «новая просьба».
     */
    finishDraftSession: () => {
      const draft = sessions.draftSession;
      if (draft?.status !== 'waiting_user') {
        return;
      }
      if (chatOpen) {
        setPick({ key: chatKey, value: draft.id });
      }
      sessions.close(draft.id).catch(() => undefined);
    },
    selectCreated: (sessionId: string | null) => {
      const previous = sessions.active;
      if (previous && previous.id !== sessionId && previous.id !== sessions.draftSession?.id) {
        sessions.close(previous.id).catch(() => undefined);
      }
      setPick(sessionId ? { key: chatKey, value: sessionId } : null);
    },
    /** ✨ в тулбаре: без сессии — новая просьба про спринт, с сессией — её чат. */
    toggleChat: () => {
      setPick(null);
      sprintPlannerUi.setAgentRequestTarget(chatOpen ? null : { kind: sessions.active ? 'session' : 'sprint' });
    },
    /** Шапка чата: начать новую сессию; повторно — назад к текущей. */
    toggleNewSession: () => {
      setPick(selected === 'new' ? null : { key: chatKey, value: 'new' });
    },
  };
}

export type AgentIslandChat = ReturnType<typeof useAgentIslandChat>;
