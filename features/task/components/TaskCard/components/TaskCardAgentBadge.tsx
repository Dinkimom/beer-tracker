'use client';

import type { AgentDevTask } from '@/lib/agentSessions/agentDevState';

import { observer } from 'mobx-react-lite';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { useRootStore } from '@/lib/layers';

const STATE_CLASS: Record<AgentDevTask['state'], string> = {
  candidate: 'border-dashed border-violet-400 bg-white text-violet-600 dark:border-violet-400 dark:bg-gray-800 dark:text-violet-300',
  closed: 'border-gray-300 bg-gray-100 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300',
  review: 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-500/25 dark:text-green-200',
  waitingAgent: 'border-gray-300 bg-white text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200',
  waitingUser: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-500/25 dark:text-blue-200',
  working: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-500/25 dark:text-amber-200',
};

/**
 * Значок на карточке задачи, которой занимается агент: цвет — где работа (жёлтый пульсирует, пока
 * агент работает; синий — ждёт тебя; зелёный — ветка на ревью; пунктир — агент предложил отдать
 * задачу ему). Клик открывает чат на сессии —
 * там, где на доске есть чат агента (свимлейн); в канбане чата нет, значок только показывает.
 */
export const TaskCardAgentBadge = observer(function TaskCardAgentBadge({
  agentDev,
  className,
  interactive = true,
}: {
  agentDev: AgentDevTask;
  /** Открывать ли чат по клику: на доске без острова агента — только значок. */
  interactive?: boolean;
  /** Форма под место: угол карточки свимлейна или канбана. */
  className: string;
}) {
  const { t } = useI18n();
  const { sprintPlannerUi } = useRootStore();
  const label = t(`agentSession.devState.${agentDev.state}`);
  const look = `${className} ${STATE_CLASS[agentDev.state]} ${agentDev.state === 'working' ? 'motion-safe:animate-pulse' : ''}`;
  if (!interactive) {
    return (
      <TextTooltip content={label}>
        <span aria-label={label} className={look} data-task-card-agent-badge={agentDev.state} role="img">
          <Icon className="h-2.5 w-2.5" name="sparkles" />
        </span>
      </TextTooltip>
    );
  }
  return (
    <TextTooltip content={label}>
      <button
        aria-label={label}
        className={`${look} pointer-events-auto cursor-pointer transition-transform duration-200 active:scale-[0.95]`}
        data-task-card-agent-badge={agentDev.state}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          sprintPlannerUi.setAgentRequestTarget({ kind: 'session', sessionId: agentDev.sessionId });
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Icon className="h-2.5 w-2.5" name="sparkles" />
      </button>
    </TextTooltip>
  );
});
