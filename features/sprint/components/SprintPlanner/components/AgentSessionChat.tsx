'use client';

import type { AgentSessionChatOrigin } from '../utils/agentChatOrigin';
import type { AgentBridgeStep } from '@/lib/agentSessions/agentBridge';
import type { AgentSession } from '@/lib/agentSessions/agentSession';

import { useI18n } from '@/contexts/LanguageContext';
import { AgentComposer } from '@/features/swimlane/components/AgentComposer';
import { useAgentBridge } from '@/features/swimlane/hooks/useAgentBridge';
import { agentBridgeUnansweredRun } from '@/lib/agentSessions/agentBridge';

import { useAgentChatDraft } from '../hooks/useAgentChatDraft';
import { useAgentWaitProgress } from '../hooks/useAgentWaitProgress';

import { AgentBridgeOutcomeNotice } from './AgentBridgeOutcomeNotice';
import { AgentBridgeProgress } from './AgentBridgeProgress';
import { AgentBridgeToggle } from './AgentBridgeToggle';
import { AgentCallAgentBar } from './AgentCallAgentBar';
import { AgentSessionChatHeader } from './AgentSessionChatHeader';
import { AgentSessionConversation } from './AgentSessionConversation';
import { AgentSessionList } from './AgentSessionList';
import { AgentSkillForm } from './AgentSkillForm';
import { AgentSkillPicker } from './AgentSkillPicker';

/**
 * Чат сессии с агентом — верхняя часть острова агента над тулбаром инструментов: шапка
 * (список сессий и 🗑 «Очистить чат»), лента (просьбы, драфты, 💬, ответы, статус в конце), полоска «позови агента» и поле ввода.
 * Скилл (готовый сценарий с параметрами) — карточкой в пустом чате или «/» в поле ввода в любой момент:
 * вызов дописывается в текущую сессию, текст — необязательное уточнение.
 * На вопрос агента с вариантами отвечают кнопкой — она уходит обычной репликой.
 * Какую сессию показать, решает остров: заголовок открывает список сессий (`sessionList`) на месте
 * ленты и поля ввода, 🗑 — `onClear`; `session` null — пишем новую: первое сообщение её создаёт.
 */
export function AgentSessionChat({
  autoFocus = false,
  origin = {},
  session,
  sessionList,
  sprintId,
  onClear,
  onContextRemove,
  onContextSent,
  onCreated,
}: {
  autoFocus?: boolean;
  origin?: AgentSessionChatOrigin;
  session: AgentSession | null;
  sessionList: {
    draftSessionId: string | null;
    open: boolean;
    sessions: readonly AgentSession[];
    unread: ReadonlySet<string>;
    onPick: (sessionId: string | 'new') => void;
    onToggle: () => void;
  };
  sprintId: number;
  onClear: () => void;
  onContextRemove: (key: string) => void;
  onContextSent: () => void;
  onCreated: (sessionId: string | null) => void;
}) {
  const { t } = useI18n();
  const bridge = useAgentBridge();
  // Агент работает над этой сессией в Claude CLI — шаг и время показываем в пузыре «Ждёт агента».
  const bridgeRun = session ? bridge.runs.find((run) => run.sessionId === session.id) : undefined;
  // Внешний агент (claude.ai, Cursor…): что он делает — по его вызовам MCP; затих — снова зовём.
  const { progress, silentStep } = useAgentWaitProgress(session, bridgeRun);
  const draft = useAgentChatDraft({ onContextRemove, onContextSent, onCreated, origin, session, sprintId });
  const runSteps = new Map<string, AgentBridgeStep>(bridge.runs.map((run) => [run.sessionId, run.step]));
  const unanswered = session ? agentBridgeUnansweredRun(session, bridge) : null;

  return (
    <div className="flex flex-col gap-2.5" data-agent-session-chat="">
      <AgentSessionChatHeader
        listOpen={sessionList.open}
        otherUnread={[...sessionList.unread].some((id) => id !== session?.id)}
        session={session}
        sessionCount={sessionList.sessions.length}
        onClear={onClear}
        onToggleList={sessionList.onToggle}
      />

      {sessionList.open ? (
        <AgentSessionList
          currentId={session?.id ?? null}
          draftSessionId={sessionList.draftSessionId}
          runs={runSteps}
          sessions={sessionList.sessions}
          unread={sessionList.unread}
          onPick={sessionList.onPick}
        />
      ) : (
        <>
          <AgentSessionConversation
            key={session?.id ?? 'new'}
            {...(draft.hasDraftSession
              ? { empty: t('agentSession.queuedHint') }
              : { empty: t('agentSession.emptyChat'), emptyTitle: t('agentSession.emptyChatTitle') })}
            messages={session?.messages ?? []}
            status={session?.status}
            waitingDetail={
              progress ? <AgentBridgeProgress startedAt={progress.startedAt} step={progress.step} /> : undefined
            }
            onPickOption={draft.pickOption}
          />

          {draft.showSkillPicker ? <AgentSkillPicker onPick={draft.setSkill} /> : null}

          {unanswered ? <AgentBridgeOutcomeNotice run={unanswered} /> : null}

          {session?.status === 'waiting_agent' && !progress ? (
            <AgentCallAgentBar session={session} silentStep={silentStep} />
          ) : null}

          <AgentComposer
            allowEmpty={draft.skill != null}
            autoFocus={autoFocus}
            context={draft.context}
            disabled={draft.busy}
            header={<AgentSkillForm value={draft.skill} onChange={draft.setSkill} onRemove={() => draft.setSkill(null)} />}
            mentions={draft.mentions}
            placeholder={draft.placeholder}
            sprintId={sprintId}
            text={draft.text}
            onContextRemove={draft.removeContext}
            onMentionsChange={draft.setMentions}
            onSkillPick={draft.setSkill}
            onSubmit={draft.send}
            onTextChange={draft.setText}
          />
        </>
      )}

      <AgentBridgeToggle />
    </div>
  );
}
