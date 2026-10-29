'use client';

import type { AgentSessionChatOrigin } from '../utils/agentChatOrigin';
import type { AgentSession, AgentSessionStatus } from '@/lib/agentSessions/agentSession';

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

/** Какой статус показать на ✨: кто-то ждёт человека — синий, иначе кто-то ждёт агента — жёлтый. */
function aggregateStatus(sessions: readonly AgentSession[]): AgentSessionStatus | undefined {
  if (sessions.some((session) => session.status === 'waiting_user')) {
    return 'waiting_user';
  }
  return sessions.some((session) => session.status === 'waiting_agent') ? 'waiting_agent' : undefined;
}

/**
 * Состояние острова агента: открыт ли чат и откуда, какая сессия в нём, список сессий.
 * Сессий может быть несколько, агенты работают над ними параллельно; чат показывает одну —
 * выбранную в списке (заголовок чата), только что созданную или, по умолчанию, сессию драфта
 * на доске, иначе самую свежую. Выбор переживает сворачивание чата. Плашки контекста —
 * `sprintPlannerUi.agentChatContext`: «Попросить агента» с карточки или заметки добавляет плашку
 * в открытый чат, не теряя набранный текст. Вызывать из observer-компонента.
 *
 * Панель чата живёт дольше `chatOpen` на время анимации сворачивания (`panel` + `panelState`).
 * Чат сворачивают Escape, клик основной кнопкой мимо острова (`islandRef`; правый клик и контекстное
 * меню — нет) и смена режима в тулбаре инструментов.
 * Сессия закрывается 🗑 «Очистить чат»; после «Принять всё» остаётся — в ней можно продолжить разговор.
 */
export function useAgentIslandChat(sprintId: number | null) {
  const { sprintPlannerUi } = useRootStore();
  const sessions = useAgentSessions(sprintId);
  const target = sprintPlannerUi.agentRequestTarget;
  const chatOpen = target != null && sprintId != null;
  /** Какую сессию показывает чат: 'new' — пишем новую, id — выбранная; null — по умолчанию. */
  const [pick, setPick] = useState<string | null>(null);
  /** Вместо ленты — список сессий. */
  const [listOpen, setListOpen] = useState(false);
  const islandRef = useRef<HTMLDivElement>(null);
  const placementTool = sprintPlannerUi.placementTool;
  const placementToolRef = useRef(placementTool);
  // Чат свернули откуда угодно — в следующий раз он откроется на ленте, а не на списке.
  if (!chatOpen && listOpen) {
    setListOpen(false);
  }
  // Чат открыли на конкретной сессии (список, тост, «Код» в меню карточки) — показываем её.
  const requested = target?.kind === 'session' ? target.sessionId : undefined;
  const [handledRequest, setHandledRequest] = useState<string | undefined>(undefined);
  if (requested !== handledRequest) {
    setHandledRequest(requested);
    if (requested) {
      setPick(requested);
      setListOpen(false);
    }
  }

  // ✨ сам открывает чат (не мигаем), из контекстного меню добавляют плашку — не сворачиваем.
  usePopoverDismiss(() => sprintPlannerUi.setAgentRequestTarget(null), {
    capture: true,
    enabled: chatOpen,
    escape: {},
    ignoreSelector: KEEP_CHAT_OPEN_SELECTOR,
    primaryButtonOnly: true,
    refs: [islandRef],
  });

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
  const fallback = sessions.draftSession ?? sessions.openSessions[0] ?? null;
  const session =
    pick === 'new' ? null : (sessions.sessions.find((item) => item.id === pick) ?? fallback);

  const openSession = (sessionId: string | 'new') => {
    setPick(sessionId);
    setListOpen(false);
    if (!chatOpen) {
      sprintPlannerUi.setAgentRequestTarget({ kind: 'session' });
    }
  };

  const unread = useAgentReplyNotice({
    loaded: sessions.loaded,
    sessions: sessions.sessions,
    sprintId,
    viewedSessionId: chatOpen && !listOpen ? (session?.id ?? null) : null,
    onOpen: openSession,
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
    listOpen,
    panel,
    panelState: presence.state,
    session,
    sessions,
    /** Что показать на ✨ в тулбаре: чья очередь хоть в одной сессии. */
    status: aggregateStatus(sessions.openSessions),
    /** Сессии с ответом агента, который человек ещё не видел. */
    unread,
    /** Плашки контекста: снять одну крестиком; реплика ушла — очистить все. */
    clearContext: sprintPlannerUi.clearAgentChatContext,
    removeContext: sprintPlannerUi.removeAgentChatContext,
    /** 🗑: завершить показанную сессию — чат остаётся открытым, пустой, под новую просьбу. */
    clearChat: () => {
      if (session) {
        sessions.close(session.id).catch(() => undefined);
      }
      setPick('new');
    },
    /** Перейти в сессию (из списка или тоста) или к новой просьбе; свёрнутый чат открывается. */
    openSession,
    selectCreated: (sessionId: string | null) => setPick(sessionId),
    /** ✨ в тулбаре: открыть чат на выбранной сессии или свернуть его. */
    toggleChat: () => {
      sprintPlannerUi.setAgentRequestTarget(chatOpen ? null : { kind: session ? 'session' : 'sprint' });
    },
    /** Заголовок чата: список сессий вместо ленты и обратно. */
    toggleList: () => setListOpen((prev) => !prev),
  };
}

export type AgentIslandChat = ReturnType<typeof useAgentIslandChat>;
