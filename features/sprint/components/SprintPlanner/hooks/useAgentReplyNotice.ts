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

/** Что уже показано человеку: ответы на момент загрузки спринта и всё, что было при открытом чате. */
interface Acked {
  ids: ReadonlySet<string>;
  sprintId: number | null;
}

/**
 * Ответ агента, пока чат свёрнут: тост «Claude ответил» (клик открывает чат) и непрочитанное на ✨.
 * Вкладка в фоне — тост ждёт возвращения на неё. Ответы, бывшие до загрузки спринта, не новые.
 * Возвращает, есть ли непрочитанный ответ.
 */
export function useAgentReplyNotice(input: {
  chatOpen: boolean;
  loaded: boolean;
  sessions: readonly AgentSession[];
  sprintId: number | null;
  onOpen: () => void;
}): boolean {
  const { chatOpen, loaded, sessions, sprintId, onOpen } = input;
  const { t } = useI18n();
  const replies = useMemo(
    () => sessions.flatMap((session) => session.messages.filter((message) => message.authorKind === 'agent')),
    [sessions]
  );
  const [acked, setAcked] = useState<Acked | null>(null);
  // Первая загрузка спринта и открытый чат — всё видно (setState во время рендера, без эффекта).
  const stale = acked?.sprintId !== sprintId;
  const seenAll = !stale && replies.every((message) => acked?.ids.has(message.id));
  if (loaded && (stale || (chatOpen && !seenAll))) {
    setAcked({ ids: new Set(replies.map((message) => message.id)), sprintId });
  }
  const latest: AgentSessionMessage | undefined =
    acked?.sprintId === sprintId ? replies.findLast((message) => !acked.ids.has(message.id)) : undefined;

  const toastedRef = useRef<string | null>(null);
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    if (chatOpen) {
      toast.dismiss(TOAST_ID);
    }
  }, [chatOpen]);

  useEffect(() => {
    if (!latest || toastedRef.current === latest.id) {
      return;
    }
    const agent = (latest.clientBrand && mcpOAuthClientBrandName(latest.clientBrand)) || t('agentSession.agent');
    const show = () => {
      toastedRef.current = latest.id;
      toast(
        () =>
          createElement(AgentReplyToast, {
            openLabel: t('agentSession.replyToastOpen'),
            snippet: latest.kind === 'draft' ? '' : snippetOf(latest.text),
            title: t(latest.kind === 'draft' ? 'agentSession.draftToast' : 'agentSession.replyToast', { agent }),
            onOpen: () => {
              toast.dismiss(TOAST_ID);
              onOpenRef.current();
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

  return latest != null;
}
