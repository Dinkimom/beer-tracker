'use client';

import type { AgentSession, AgentSessionMessage } from '@/lib/agentSessions/agentSession';

import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { mcpOAuthClientBrandName } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

import { AgentReplyToast } from '../components/AgentReplyToast';

const TOAST_ID = 'agent-reply';
const TOAST_DURATION_MS = 8000;
const SNIPPET_MAX = 140;

/** Начало ответа одной строкой, без разметки markdown. */
function snippetOf(text: string): string {
  const flat = text.replace(/[*_`#>~]|\[[ x]\]/g, '').replace(/\s+/g, ' ').trim();
  return flat.length <= SNIPPET_MAX ? flat : `${flat.slice(0, SNIPPET_MAX - 1)}…`;
}

/** Что уже показано человеку: ответы на момент загрузки спринта и всё, что было в открытой сессии. */
interface Acked {
  ids: ReadonlySet<string>;
  sprintId: number | null;
}

interface AgentReply {
  message: AgentSessionMessage;
  sessionId: string;
}

/**
 * Ответы агента, которые человек не видел: по сессиям. Сессия прочитана, когда она открыта в чате;
 * ответ в другой сессии — тост «Claude ответил» (клик открывает её) и точка в списке сессий.
 * Вкладка в фоне — тост ждёт возвращения на неё. Ответы, бывшие до загрузки спринта, не новые.
 * Возвращает id сессий с непрочитанным ответом.
 */
export function useAgentReplyNotice(input: {
  loaded: boolean;
  sessions: readonly AgentSession[];
  sprintId: number | null;
  /** Сессия, открытая в развёрнутом чате; null — чат свёрнут или пишем новую. */
  viewedSessionId: string | null;
  onOpen: (sessionId: string) => void;
}): ReadonlySet<string> {
  const { loaded, sessions, sprintId, viewedSessionId, onOpen } = input;
  const { t } = useI18n();
  const replies = useMemo<AgentReply[]>(
    () =>
      sessions
        .flatMap((session) =>
          session.messages
            .filter((message) => message.authorKind === 'agent')
            .map((message) => ({ message, sessionId: session.id }))
        )
        .sort((a, b) => a.message.createdAt.localeCompare(b.message.createdAt)),
    [sessions]
  );
  const [acked, setAcked] = useState<Acked | null>(null);
  // Первая загрузка спринта — всё видно; открытая сессия — видны её ответы (setState во время рендера).
  const stale = acked?.sprintId !== sprintId;
  const viewedUnseen = stale
    ? []
    : replies.filter((reply) => reply.sessionId === viewedSessionId && !acked?.ids.has(reply.message.id));
  if (loaded && stale) {
    setAcked({ ids: new Set(replies.map((reply) => reply.message.id)), sprintId });
  } else if (loaded && viewedUnseen.length > 0) {
    setAcked({ ids: new Set([...(acked?.ids ?? []), ...viewedUnseen.map((reply) => reply.message.id)]), sprintId });
  }
  const unseen = stale ? [] : replies.filter((reply) => !acked?.ids.has(reply.message.id));
  const unread: ReadonlySet<string> = new Set(unseen.map((reply) => reply.sessionId));
  const latest = unseen.at(-1);

  const toastedRef = useRef<string | null>(null);
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    if (!latest) {
      toast.dismiss(TOAST_ID);
      return;
    }
    if (toastedRef.current === latest.message.id) {
      return;
    }
    const { message, sessionId } = latest;
    const agent = (message.clientBrand && mcpOAuthClientBrandName(message.clientBrand)) || t('agentSession.agent');
    const show = () => {
      toastedRef.current = message.id;
      toast(
        () =>
          createElement(AgentReplyToast, {
            openLabel: t('agentSession.replyToastOpen'),
            snippet: message.kind === 'draft' ? '' : snippetOf(message.text),
            title: t(message.kind === 'draft' ? 'agentSession.draftToast' : 'agentSession.replyToast', { agent }),
            onOpen: () => {
              toast.dismiss(TOAST_ID);
              onOpenRef.current(sessionId);
            },
          }),
        { duration: TOAST_DURATION_MS, id: TOAST_ID }
      );
    };
    if (!document.hidden) {
      show();
      return;
    }
    const onVisible = () => {
      if (!document.hidden) {
        show();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [latest, t]);

  return unread;
}
