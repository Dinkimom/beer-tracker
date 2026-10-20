'use client';

import type { AgentSessionChatOrigin } from '../utils/agentChatOrigin';
import type { AgentMention } from '@/lib/agentSessions/agentMentions';
import type { AgentSession } from '@/lib/agentSessions/agentSession';

import { useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { AgentComposer } from '@/features/swimlane/components/AgentComposer';
import { useAgentSessions } from '@/features/swimlane/hooks/useAgentSessions';
import { collectUsedAgentMentions, mergeAgentMentions } from '@/lib/agentSessions/agentMentions';

import { AgentBridgeToggle } from './AgentBridgeToggle';
import { AgentCallAgentBar } from './AgentCallAgentBar';
import { AgentSessionConversation } from './AgentSessionConversation';

/**
 * Чат сессии с агентом — верхняя часть острова агента над тулбаром инструментов: заголовок,
 * лента (просьбы, драфты, 💬, ответы, статус в конце), полоска «позови агента» и поле ввода.
 * Какую сессию показать, решает остров (кнопки «Новая» / «Завершить» в его строке);
 * `session` null — пишем новую: первое сообщение её создаёт.
 */
export function AgentSessionChat({
  autoFocus = false,
  origin = {},
  session,
  sprintId,
  onCreated,
}: {
  autoFocus?: boolean;
  origin?: AgentSessionChatOrigin;
  session: AgentSession | null;
  sprintId: number;
  onCreated: (sessionId: string | null) => void;
}) {
  const { t } = useI18n();
  const sessions = useAgentSessions(sprintId);
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<AgentMention[]>([]);
  const busy = sessions.creating || sessions.posting;
  const context = origin.mentions ?? [];

  const reset = () => {
    setText('');
    setMentions([]);
  };

  const send = () => {
    const request = text.trim();
    if (busy || !request) {
      return;
    }
    const used = mergeAgentMentions(context, collectUsedAgentMentions(request, mentions));
    if (session) {
      sessions
        .post({ kind: 'message', mentions: used, sessionId: session.id, text: request })
        .then(reset)
        .catch(() => toast.error(t('agentSession.sendFailed')));
      return;
    }
    sessions
      .create({ context: origin.context ?? {}, mentions: used, taskId: origin.taskId, text: request })
      .then((created) => {
        reset();
        onCreated(created?.id ?? null);
      })
      .catch(() => toast.error(t('agentSession.submitFailed')));
  };

  return (
    <div className="flex flex-col gap-2.5" data-agent-session-chat="">
      <h3 className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100" title={session?.title}>
        {session?.title ?? t('agentSession.newSessionTitle')}
      </h3>

      <AgentSessionConversation
        empty={sessions.draftSession ? t('agentSession.queuedHint') : t('agentSession.emptyChat')}
        messages={session?.messages ?? []}
        status={session?.status}
      />

      {session?.status === 'waiting_agent' ? <AgentCallAgentBar sessionId={session.id} /> : null}

      <AgentComposer
        autoFocus={autoFocus}
        context={context}
        disabled={busy}
        mentions={mentions}
        placeholder={session ? t('agentSession.chatPlaceholder') : t('agentSession.requestPlaceholder')}
        sprintId={sprintId}
        text={text}
        onMentionsChange={setMentions}
        onSubmit={send}
        onTextChange={setText}
      />

      <AgentBridgeToggle />
    </div>
  );
}
