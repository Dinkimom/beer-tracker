'use client';

import type { AgentSessionChatOrigin } from '../utils/agentChatOrigin';
import type { AgentSession, AgentSessionStatus } from '@/lib/agentSessions/agentSession';
import type { AgentDevRequest } from '@/lib/layers/application/mobx/stores/sprintPlannerUiStore';

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
  /** «Код» в меню карточки: новая сессия разработки по задаче, ещё не отправленная. */
  chat: { dev: AgentDevRequest | null; key: string; origin: AgentSessionChatOrigin };
  session: AgentSession | null;
}

type IslandTarget = ReturnType<typeof useRootStore>['sprintPlannerUi']['agentRequestTarget'];

/** «Код» в меню карточки: задача, которую отдают агенту, пока сессия по ней не создана. */
function devRequestOf(target: IslandTarget): AgentDevRequest | null {
  return target?.kind === 'dev' ? { sprintName: target.sprintName, task: target.task } : null;
}

/** Чат открыли на конкретной сессии (список, тост, отправленная задача агенту). */
function requestedSessionOf(target: IslandTarget): string | undefined {
  return target?.kind === 'session' ? target.sessionId : undefined;
}

/**
 * Чат открыли на конкретной сессии (список, тост, отправленная задача агенту) — показать её один раз
 * на каждый новый запрос (setState во время рендера, без эффекта).
 */
function useRequestedSession(requested: string | undefined, onRequest: (sessionId: string) => void) {
  const [handled, setHandled] = useState<string | undefined>(undefined);
  if (requested !== handled) {
    setHandled(requested);
    if (requested) {
      onRequest(requested);
    }
  }
}

/**
 * Какую сессию показать: у задачи агенту — ещё никакой; 'new' — новую; выбранную; иначе сессию
 * драфта на доске, иначе самую свежую.
 */
function shownSession(
  dev: AgentDevRequest | null,
  pick: string | null,
  sessions: ReturnType<typeof useAgentSessions>
): AgentSession | null {
  if (dev || pick === 'new') {
    return null;
  }
  const fallback = sessions.draftSession ?? sessions.openSessions[0] ?? null;
  return sessions.sessions.find((item) => item.id === pick) ?? fallback;
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
  useRequestedSession(requestedSessionOf(target), (sessionId) => {
    setPick(sessionId);
    setListOpen(false);
  });

  // ✨ сам открывает чат (не мигаем), из контекстного меню добавляют плашку — не сворачиваем.
  // Пока открыт список сессий, клик мимо и Escape закрывают его, а не весь чат.
  usePopoverDismiss(() => sprintPlannerUi.setAgentRequestTarget(null), {
    capture: true,
    enabled: chatOpen && !listOpen,
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
  const dev = devRequestOf(target);
  const chat = chatOpen ? { dev, key: dev ? `dev:${dev.task.id}` : CHAT_KEY, origin } : null;
  const session = shownSession(dev, pick, sessions);

  const openSession = (sessionId: string | 'new') => {
    setPick(sessionId);
    setListOpen(false);
    // Из свёрнутого чата или из ещё не отправленной задачи агенту — в обычный чат сессии.
    if (!chatOpen || dev) {
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
  if (chat && (lastPanel?.chat.origin !== origin || lastPanel.chat.key !== chat.key || lastPanel.session !== session)) {
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
    /** Первая реплика создала сессию: чат дальше показывает её (задача агенту — уже обычная сессия). */
    selectCreated: (sessionId: string | null) => {
      if (dev && sessionId) {
        sprintPlannerUi.setAgentRequestTarget({ kind: 'session', sessionId });
        return;
      }
      setPick(sessionId);
    },
    /** ✨ в тулбаре: открыть чат на выбранной сессии или свернуть его. */
    toggleChat: () => {
      sprintPlannerUi.setAgentRequestTarget(chatOpen ? null : { kind: session ? 'session' : 'sprint' });
    },
    /** Заголовок чата: список сессий вместо ленты и обратно. */
    toggleList: () => setListOpen((prev) => !prev),
  };
}

export type AgentIslandChat = ReturnType<typeof useAgentIslandChat>;
