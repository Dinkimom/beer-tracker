'use client';

import type { AgentSessionChatOrigin } from '../utils/agentChatOrigin';
import type { AgentSession } from '@/lib/agentSessions/agentSession';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { CONTEXT_MENU_GHOST_BUTTON_RESET } from '@/features/context-menu/contextMenuClasses';
import { AgentComposer } from '@/features/swimlane/components/AgentComposer';
import { useAgentBridge } from '@/features/swimlane/hooks/useAgentBridge';

import { useAgentChatDraft } from '../hooks/useAgentChatDraft';
import { useAgentWaitProgress } from '../hooks/useAgentWaitProgress';

import { AgentBridgeProgress } from './AgentBridgeProgress';
import { AgentBridgeToggle } from './AgentBridgeToggle';
import { AgentCallAgentBar } from './AgentCallAgentBar';
import { AgentSessionConversation } from './AgentSessionConversation';
import { AgentSkillForm } from './AgentSkillForm';
import { AgentSkillPicker } from './AgentSkillPicker';

/** Квадратная иконочная кнопка: без горизонтальных отступов, иначе svg сжимается в 24px. */
const HEADER_ICON_CLASS = `${CONTEXT_MENU_GHOST_BUTTON_RESET} !h-6 !min-h-0 !w-6 shrink-0 !rounded-md !p-0 text-gray-500 hover:!bg-gray-500/[0.12] hover:text-gray-700 dark:text-gray-400 dark:hover:!bg-white/[0.08] dark:hover:text-gray-200`;

/**
 * Чат сессии с агентом — верхняя часть острова агента над тулбаром инструментов: заголовок
 * с 🗑 «Очистить чат» (завершает сессию), лента (просьбы, драфты, 💬, ответы, статус в конце), полоска «позови агента» и поле ввода.
 * Скилл (готовый сценарий с параметрами) — карточкой в пустом чате или «/» в поле ввода в любой момент:
 * вызов дописывается в текущую сессию, текст — необязательное уточнение.
 * На вопрос агента с вариантами отвечают кнопкой — она уходит обычной репликой.
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
  const bridge = useAgentBridge();
  // Агент работает над этой сессией в Claude CLI — шаг и время показываем в пузыре «Ждёт агента».
  const bridgeRun = session ? bridge.runs.find((run) => run.sessionId === session.id) : undefined;
  // Внешний агент (claude.ai, Cursor…): что он делает — по его вызовам MCP; затих — снова зовём.
  const { progress, silentStep } = useAgentWaitProgress(session, bridgeRun);
  const draft = useAgentChatDraft({ onCreated, origin, session, sprintId });

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

      {session?.status === 'waiting_agent' && !progress ? (
        <AgentCallAgentBar sessionId={session.id} silentStep={silentStep} />
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
        onMentionsChange={draft.setMentions}
        onSkillPick={draft.setSkill}
        onSubmit={draft.send}
        onTextChange={draft.setText}
      />

      <AgentBridgeToggle />
    </div>
  );
}
