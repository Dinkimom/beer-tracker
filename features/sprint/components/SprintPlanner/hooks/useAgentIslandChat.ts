'use client';

import type { AgentSessionChatOrigin } from '../utils/agentChatOrigin';
import type { AgentSession } from '@/lib/agentSessions/agentSession';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useAgentSessions } from '@/features/swimlane/hooks/useAgentSessions';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';
import { usePopoverDismiss } from '@/hooks/usePopoverDismiss';
import { useRootStore } from '@/lib/layers';

import { resolveAgentChatOrigin } from '../utils/agentChatOrigin';

import { useAgentReplyNotice } from './useAgentReplyNotice';

/** ✨ в тулбаре и контекстное меню («Попросить агента» добавляет плашку) — клик по ним не сворачивает чат. */
const KEEP_CHAT_OPEN_SELECTOR = '[data-swimlane-ask-agent], [data-planner-context-menu]';

/** Один чат на остров: смена задачи или заметки, с которой позвали агента, его не пересоздаёт. */
const CHAT_KEY = 'chat';

/** Что рисует панель чата; при сворачивании — последний открытый, пока идёт анимация. */
interface ChatPanel {
  chat: { key: string; origin: AgentSessionChatOrigin };
  session: AgentSession | null;
}

/**
 * Состояние острова агента: открыт ли чат и откуда, какая сессия в нём (текущая / новая /
 * только что созданная), действия — ✨ в тулбаре, новая сессия и 🗑 «Очистить чат» в шапке чата. Выбор
 * сессии сбрасывается при закрытии чата. Плашки контекста — `sprintPlannerUi.agentChatContext`:
 * «Попросить агента» с карточки или заметки добавляет плашку в открытый чат, не теряя набранный текст.
 * Вызывать из observer-компонента.
 *
 * Панель чата живёт дольше `chatOpen` на время анимации сворачивания (`panel` + `panelState`).
 * Чат сворачивают Escape, клик основной кнопкой мимо острова (`islandRef`; правый клик и контекстное
 * меню — нет) и смена режима в тулбаре инструментов.
 * Сессия закрывается 🗑 «Очистить чат» и сама при старте новой (прежняя, если её драфт не висит
 * на доске). После «Принять всё» сессия остаётся: в ней можно продолжить разговор с агентом.
 */
export function useAgentIslandChat(sprintId: number | null) {
  const { sprintPlannerUi } = useRootStore();
  const sessions = useAgentSessions(sprintId);
  const target = sprintPlannerUi.agentRequestTarget;
  const chatOpen = target != null && sprintId != null;
  /** Какую сессию показывает чат: 'new' — пишем новую, id — только что созданная; null — активная. */
  const [pick, setPick] = useState<string | null>(null);
  const islandRef = useRef<HTMLDivElement>(null);
  const placementTool = sprintPlannerUi.placementTool;
  const placementToolRef = useRef(placementTool);
  // Чат свернули откуда угодно — выбор сессии сбрасываем (setState во время рендера, без эффекта).
  if (!chatOpen && pick) {
    setPick(null);
  }

  // ✨ сам открывает чат (не мигаем), из контекстного меню добавляют плашку — не сворачиваем.
  usePopoverDismiss(
    () => {
      setPick(null);
      sprintPlannerUi.setAgentRequestTarget(null);
    },
    {
      capture: true,
      enabled: chatOpen,
      escape: {},
      ignoreSelector: KEEP_CHAT_OPEN_SELECTOR,
      primaryButtonOnly: true,
      refs: [islandRef],
    }
  );

  // Выбор режима в тулбаре (и хоткеем) сворачивает чат.
  useEffect(() => {
    if (placementToolRef.current === placementTool) {
      return;
    }
    placementToolRef.current = placementTool;
    sprintPlannerUi.setAgentRequestTarget(null);
  }, [placementTool, sprintPlannerUi]);

  const contextItems = sprintPlannerUi.agentChatContext;
  // Ссылка меняется только с плашками (observable.ref): по ней обновляется панель ниже.
  const origin = useMemo(() => resolveAgentChatOrigin(contextItems, undefined), [contextItems]);
  const chat = chatOpen ? { key: CHAT_KEY, origin } : null;
  const selected = pick;
  const session =
    selected === 'new' ? null : (sessions.sessions.find((item) => item.id === selected) ?? sessions.active);

  const unreadReply = useAgentReplyNotice({
    chatOpen,
    loaded: sessions.loaded,
    sessions: sessions.sessions,
    sprintId,
    onOpen: () => sprintPlannerUi.setAgentRequestTarget({ kind: sessions.active ? 'session' : 'sprint' }),
  });

  const presence = useOverlayPresence(chatOpen);
  const [lastPanel, setLastPanel] = useState<ChatPanel | null>(null);
  if (chat && (lastPanel?.chat.origin !== origin || lastPanel.session !== session)) {
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
    /** Агент ответил, пока чат был свёрнут: ✨ в тулбаре это показывает. */
    unreadReply,
    /** Плашки контекста: снять одну крестиком; реплика ушла — очистить все. */
    clearContext: sprintPlannerUi.clearAgentChatContext,
    removeContext: sprintPlannerUi.removeAgentChatContext,
    /** 🗑: завершить показанную сессию — открытый чат остаётся, пустой, под новую просьбу. */
    clearChat: () => {
      if (session) {
        sessions.close(session.id).catch(() => undefined);
      }
      setPick(null);
    },
    selectCreated: (sessionId: string | null) => {
      const previous = sessions.active;
      if (previous && previous.id !== sessionId && previous.id !== sessions.draftSession?.id) {
        sessions.close(previous.id).catch(() => undefined);
      }
      setPick(sessionId);
    },
    /** ✨ в тулбаре: без сессии — новая просьба про спринт, с сессией — её чат. */
    toggleChat: () => {
      setPick(null);
      sprintPlannerUi.setAgentRequestTarget(chatOpen ? null : { kind: sessions.active ? 'session' : 'sprint' });
    },
    /** Шапка чата: начать новую сессию; повторно — назад к текущей. */
    toggleNewSession: () => {
      setPick(selected === 'new' ? null : 'new');
    },
  };
}

export type AgentIslandChat = ReturnType<typeof useAgentIslandChat>;
