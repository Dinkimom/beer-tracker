'use client';

import type { AgentSessionChatOrigin } from '../utils/agentChatOrigin';
import type { AgentMention } from '@/lib/agentSessions/agentMentions';
import type { AgentSession } from '@/lib/agentSessions/agentSession';
import type { AgentSessionSkill } from '@/lib/agentSessions/agentSkills';
import type { AgentDevRequest } from '@/lib/layers/application/mobx/stores/sprintPlannerUiStore';

import { useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { useAgentSessions } from '@/features/swimlane/hooks/useAgentSessions';
import { collectUsedAgentMentions, mergeAgentMentions } from '@/lib/agentSessions/agentMentions';

import { agentSkillTitle } from '../utils/agentSkillCaption';

function composerPlaceholder(
  session: AgentSession | null,
  skill: AgentSessionSkill | null,
  dev: AgentDevRequest | null,
  t: (key: string) => string
): string {
  if (dev) {
    return t('agentSession.devPlaceholder');
  }
  if (skill) {
    return t('agentSession.skillNotePlaceholder');
  }
  return session ? t('agentSession.chatPlaceholder') : t('agentSession.requestPlaceholder');
}

/**
 * Черновик чата с агентом: текст, «@»-упоминания, скилл и плашки контекста (`origin.chips`).
 * `send` дописывает реплику в `session` или создаёт новую сессию; плашки уходят с репликой
 * и очищаются (`onContextSent`). Со скиллом текст необязателен — репликой станет его название;
 * `pickOption` отвечает на вопрос агента выбранным вариантом. `dev` — задача агенту в работу («Сделать в коде»):
 * поле уже с просьбой по задаче, её можно дописать; отправка создаёт сессию разработки.
 */
export function useAgentChatDraft({
  dev = null,
  origin,
  session,
  sprintId,
  onContextRemove,
  onContextSent,
  onCreated,
}: {
  dev?: AgentDevRequest | null;
  origin: AgentSessionChatOrigin;
  session: AgentSession | null;
  sprintId: number;
  /** Снять плашку контекста по её ключу. */
  onContextRemove: (key: string) => void;
  /** Реплика ушла — плашки контекста больше не нужны. */
  onContextSent: () => void;
  onCreated: (sessionId: string | null) => void;
}) {
  const { t } = useI18n();
  const sessions = useAgentSessions(sprintId);
  const [text, setText] = useState(() =>
    dev ? t('agentSession.devRequest', { key: dev.taskKey, summary: dev.summary }) : ''
  );
  const [mentions, setMentions] = useState<AgentMention[]>([]);
  const [skill, setSkill] = useState<AgentSessionSkill | null>(null);
  const busy = sessions.creating || sessions.posting;
  const chips = origin.chips ?? [];
  const context = chips.map((chip) => chip.mention);

  const reset = () => {
    setText('');
    setMentions([]);
    setSkill(null);
    onContextSent();
  };

  const send = () => {
    const request = text.trim();
    if (busy || (!request && !skill)) {
      return;
    }
    const used = mergeAgentMentions(context, collectUsedAgentMentions(request, mentions));
    const skillTitle = skill ? agentSkillTitle(skill.id, t) : undefined;
    const message = { mentions: used, skill: skill ?? undefined, text: request || (skillTitle ?? '') };
    if (session) {
      sessions
        .post({ ...message, kind: 'message', sessionId: session.id })
        .then(reset)
        .catch(() => toast.error(t('agentSession.sendFailed')));
      return;
    }
    const devSession = dev
      ? {
          context: { assigneeName: dev.assigneeName, sprintName: dev.sprintName, summary: dev.summary, taskKey: dev.taskKey },
          kind: 'dev' as const,
          taskId: dev.taskKey,
          title: dev.summary,
        }
      : null;
    sessions
      .create({ ...message, context: origin.context ?? {}, taskId: origin.taskId, title: skillTitle, ...devSession })
      .then((created) => {
        reset();
        onCreated(created?.id ?? null);
      })
      .catch(() => toast.error(t('agentSession.submitFailed')));
  };

  const devOffer: AgentDevRequest | null =
    !session && !dev && origin.taskId
      ? {
          assigneeName: origin.context?.assigneeName,
          sprintName: origin.context?.sprintName,
          summary: origin.context?.summary ?? origin.taskId,
          taskKey: origin.taskId,
        }
      : null;

  /** Пустая лента: что будет дальше — у задачи агенту, у новой просьбы за чужим драфтом и у обычной. */
  let empty: { text: string; title?: string } = {
    text: t('agentSession.emptyChat'),
    title: t('agentSession.emptyChatTitle'),
  };
  if (dev) {
    empty = { text: t('agentSession.devEmpty', { key: dev.taskKey }), title: t('agentSession.devEmptyTitle') };
  } else if (devOffer) {
    empty = { text: devOffer.summary, title: t('agentSession.taskEmptyTitle', { key: devOffer.taskKey }) };
  } else if (sessions.draftSession != null && sessions.draftSession.id !== session?.id) {
    empty = { text: t('agentSession.queuedHint') };
  }

  const pickOption = (option: string) => {
    if (busy || !session) {
      return;
    }
    sessions
      .post({ kind: 'message', sessionId: session.id, text: option })
      .catch(() => toast.error(t('agentSession.sendFailed')));
  };

  return {
    busy,
    context,
    empty,
    mentions,
    /** Заголовок чата, пока сессии нет: у задачи агенту — её ключ. */
    newTitle: dev ? t('agentSession.devTitle', { key: dev.taskKey }) : undefined,
    pickOption,
    placeholder: composerPlaceholder(session, skill, dev, t),
    send,
    removeContext: (item: AgentMention) => {
      const chip = chips.find((candidate) => candidate.mention === item);
      if (chip) {
        onContextRemove(chip.key);
      }
    },
    setMentions,
    setSkill,
    setText,
    skill,
    /** Сценарии («/») — про план спринта: у задачи агенту в работу и в сессии разработки их нет. */
    skillsEnabled: !dev && session?.kind !== 'dev',
    /** Карточки сценариев — в пустом чате новой сессии, пока скилл не выбран («/» работает всегда). */
    showSkillPicker: !session && !skill && !dev && !devOffer,
    /** Новая просьба про одну задачу: её можно сразу отдать агенту сделать в коде. */
    devOffer,
    text,
  };
}
