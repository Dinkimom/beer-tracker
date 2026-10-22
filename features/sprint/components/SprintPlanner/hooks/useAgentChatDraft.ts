'use client';

import type { AgentSessionChatOrigin } from '../utils/agentChatOrigin';
import type { AgentMention } from '@/lib/agentSessions/agentMentions';
import type { AgentSession } from '@/lib/agentSessions/agentSession';
import type { AgentSessionSkill } from '@/lib/agentSessions/agentSkills';

import { useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { useAgentSessions } from '@/features/swimlane/hooks/useAgentSessions';
import { collectUsedAgentMentions, mergeAgentMentions } from '@/lib/agentSessions/agentMentions';

import { agentSkillTitle } from '../utils/agentSkillCaption';

function composerPlaceholder(
  session: AgentSession | null,
  skill: AgentSessionSkill | null,
  t: (key: string) => string
): string {
  if (skill) {
    return t('agentSession.skillNotePlaceholder');
  }
  return session ? t('agentSession.chatPlaceholder') : t('agentSession.requestPlaceholder');
}

/**
 * Черновик чата с агентом: текст, «@»-упоминания и скилл. `send` дописывает реплику в `session`
 * или создаёт новую сессию; со скиллом текст необязателен — репликой станет его название;
 * `pickOption` отвечает на вопрос агента выбранным вариантом.
 */
export function useAgentChatDraft({
  origin,
  session,
  sprintId,
  onCreated,
}: {
  origin: AgentSessionChatOrigin;
  session: AgentSession | null;
  sprintId: number;
  onCreated: (sessionId: string | null) => void;
}) {
  const { t } = useI18n();
  const sessions = useAgentSessions(sprintId);
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<AgentMention[]>([]);
  const [skill, setSkill] = useState<AgentSessionSkill | null>(null);
  const busy = sessions.creating || sessions.posting;
  const context = origin.mentions ?? [];

  const reset = () => {
    setText('');
    setMentions([]);
    setSkill(null);
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
    sessions
      .create({ ...message, context: origin.context ?? {}, taskId: origin.taskId, title: skillTitle })
      .then((created) => {
        reset();
        onCreated(created?.id ?? null);
      })
      .catch(() => toast.error(t('agentSession.submitFailed')));
  };

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
    /** Новая просьба встанет в очередь за драфтом другой сессии. */
    hasDraftSession: sessions.draftSession != null,
    mentions,
    pickOption,
    placeholder: composerPlaceholder(session, skill, t),
    send,
    setMentions,
    setSkill,
    setText,
    skill,
    /** Карточки сценариев — в пустом чате новой сессии, пока скилл не выбран («/» работает всегда). */
    showSkillPicker: !session && !skill,
    text,
  };
}
