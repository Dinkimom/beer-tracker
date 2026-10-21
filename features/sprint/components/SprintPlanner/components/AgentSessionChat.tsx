'use client';

import type { AgentSessionChatOrigin } from '../utils/agentChatOrigin';
import type { AgentMention } from '@/lib/agentSessions/agentMentions';
import type { AgentSession } from '@/lib/agentSessions/agentSession';

import { useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { CONTEXT_MENU_GHOST_BUTTON_RESET } from '@/features/context-menu/contextMenuClasses';
import { AgentComposer } from '@/features/swimlane/components/AgentComposer';
import { useAgentBridge } from '@/features/swimlane/hooks/useAgentBridge';
import { useAgentSessions } from '@/features/swimlane/hooks/useAgentSessions';
import { collectUsedAgentMentions, mergeAgentMentions } from '@/lib/agentSessions/agentMentions';

import { AgentBridgeProgress } from './AgentBridgeProgress';
import { AgentBridgeToggle } from './AgentBridgeToggle';
import { AgentCallAgentBar } from './AgentCallAgentBar';
import { AgentSessionConversation } from './AgentSessionConversation';

/** Квадратная иконочная кнопка: без горизонтальных отступов, иначе svg сжимается в 24px. */
const HEADER_ICON_CLASS = `${CONTEXT_MENU_GHOST_BUTTON_RESET} !h-6 !min-h-0 !w-6 shrink-0 !rounded-md !p-0 text-gray-500 hover:!bg-gray-500/[0.12] hover:text-gray-700 dark:text-gray-400 dark:hover:!bg-white/[0.08] dark:hover:text-gray-200`;

/**
 * Чат сессии с агентом — верхняя часть острова агента над тулбаром инструментов: заголовок
 * с 🗑 «Очистить чат» (завершает сессию), лента (просьбы, драфты, 💬, ответы, статус в конце), полоска «позови агента» и поле ввода.
 * Какую сессию показать, решает остров («Новая сессия» и «Очистить чат» в шапке — через `newSession`
 * и `onClear`); `session` null — пишем новую: первое сообщение её создаёт.
 */
export function AgentSessionChat({
  autoFocus = false,
  newSession = null,
  origin = {},
  session,
  sprintId,
  onClear,
  onCreated,
}: {
  autoFocus?: boolean;
  /** Есть активная сессия: «Новая сессия», нажата — пишем новую, повторно — назад к текущей. */
  newSession?: { selected: boolean; onToggle: () => void } | null;
  origin?: AgentSessionChatOrigin;
  session: AgentSession | null;
  sprintId: number;
  onClear: () => void;
  onCreated: (sessionId: string | null) => void;
}) {
  const { t } = useI18n();
  const sessions = useAgentSessions(sprintId);
  const bridge = useAgentBridge();
  // Агент работает над этой сессией в Claude CLI — шаг и время показываем в пузыре «Ждёт агента».
  const bridgeRun = session ? bridge.runs.find((run) => run.sessionId === session.id) : undefined;
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
      <div className="flex min-h-6 items-center gap-2">
        <h3
          className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-900 dark:text-gray-100"
          title={session?.title}
        >
          {session?.title ?? t('agentSession.newSessionTitle')}
        </h3>
        {newSession ? (
          <Button
            aria-label={newSession.selected ? t('agentSession.backToSession') : t('agentSession.newSession')}
            className={HEADER_ICON_CLASS}
            data-agent-session-new=""
            title={newSession.selected ? t('agentSession.backToSession') : t('agentSession.newSession')}
            type="button"
            variant="ghost"
            onClick={newSession.onToggle}
          >
            <Icon className="h-3.5 w-3.5" name={newSession.selected ? 'arrow-left' : 'comment-plus'} />
          </Button>
        ) : null}
        {session && session.status !== 'closed' ? (
          <Button
            aria-label={t('agentSession.clearChat')}
            className={HEADER_ICON_CLASS}
            data-agent-session-clear=""
            title={t('agentSession.clearChatHint')}
            type="button"
            variant="ghost"
            onClick={onClear}
          >
            <Icon className="h-3.5 w-3.5" name="trash" />
          </Button>
        ) : null}
      </div>

      <AgentSessionConversation
        key={session?.id ?? 'new'}
        empty={sessions.draftSession ? t('agentSession.queuedHint') : t('agentSession.emptyChat')}
        messages={session?.messages ?? []}
        status={session?.status}
        waitingDetail={
          bridgeRun ? <AgentBridgeProgress startedAt={bridgeRun.startedAt} step={bridgeRun.step} /> : undefined
        }
      />

      {session?.status === 'waiting_agent' && !bridgeRun ? <AgentCallAgentBar sessionId={session.id} /> : null}

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
