'use client';

import type { AgentSessionChatOrigin } from '../utils/agentChatOrigin';
import type { AgentSession } from '@/lib/agentSessions/agentSession';
import type { AnimationEvent } from 'react';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
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
 * только что созданная), действия — «Чат», новая сессия (в тулбаре), «↻ Переделать». Выбор сессии
 * сбрасывается при закрытии чата и смене его цели. Вызывать из observer-компонента.
 *
 * Панель чата живёт дольше `chatOpen` на время анимации сворачивания (`panel` + `panelState`).
 * Чат сворачивают Escape, клик мимо острова (`islandRef`) и смена режима в тулбаре инструментов.
 * Сессия закрывается ✕, а ещё сама: после «Принять всё», если агент ничего не ждёт,
 * и при старте новой (прежняя, если её драфт не висит на доске).
 */
export function useAgentIslandChat(sprintId: number | null, hasPendingDraft: boolean) {
  const { t } = useI18n();
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
  const redoSession = hasPendingDraft ? sessions.draftSession : null;

  const presence = useOverlayPresence(chatOpen);
  const [lastPanel, setLastPanel] = useState<ChatPanel | null>(null);
  if (chat && (lastPanel?.chat.key !== chat.key || lastPanel.session !== session)) {
    setLastPanel({ chat, session });
  }
  // Пока панель растёт или сжимается, содержимое обрезается; после — нет (иначе режется список @).
  const [panelSettled, setPanelSettled] = useState(false);
  const [settledFor, setSettledFor] = useState(chatOpen);
  if (settledFor !== chatOpen) {
    setSettledFor(chatOpen);
    setPanelSettled(false);
  }
  let panel: ChatPanel | null = null;
  if (chat) {
    panel = { chat, session };
  } else if (presence.mounted) {
    panel = lastPanel;
  }

  const openChat = () => sprintPlannerUi.setAgentRequestTarget({ kind: 'session' });

  return {
    chatOpen,
    islandRef,
    newSelected: chatOpen && selected === 'new',
    panel,
    panelSettled,
    panelState: presence.state,
    onPanelAnimationEnd: (event: AnimationEvent<HTMLElement>) => {
      if (event.target === event.currentTarget) {
        setPanelSettled(true);
      }
    },
    redoSession,
    session,
    sessions,
    /** ✕: завершить показанную сессию и свернуть чат. */
    closeSession: () => {
      if (session) {
        sessions.close(session.id).catch(() => undefined);
      }
      setPick(null);
      sprintPlannerUi.setAgentRequestTarget(null);
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
    redo: () => {
      if (!redoSession || sessions.posting) {
        return;
      }
      sessions
        .post({ kind: 'redo', mentions: [], sessionId: redoSession.id, text: '' })
        .then(() => {
          // Агент внешний: открываем чат с полоской «позови агента».
          if (!chatOpen) {
            openChat();
          }
        })
        .catch(() => toast.error(t('agentSession.sendFailed')));
    },
    selectCreated: (sessionId: string | null) => {
      const previous = sessions.active;
      if (previous && previous.id !== sessionId && previous.id !== sessions.draftSession?.id) {
        sessions.close(previous.id).catch(() => undefined);
      }
      setPick(sessionId ? { key: chatKey, value: sessionId } : null);
    },
    toggleChat: () => {
      setPick(null);
      if (chatOpen) {
        sprintPlannerUi.setAgentRequestTarget(null);
      } else {
        openChat();
      }
    },
    toggleNewSession: () => {
      if (!chatOpen) {
        openChat();
      }
      setPick(selected === 'new' ? null : { key: chatKey, value: 'new' });
    },
  };
}

export type AgentIslandChat = ReturnType<typeof useAgentIslandChat>;
