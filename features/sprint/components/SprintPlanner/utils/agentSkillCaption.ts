import type { AgentSessionSkill } from '@/lib/agentSessions/agentSkills';

import { findAgentSkill } from '@/lib/agentSessions/agentSkills';

type Translate = (key: string, params?: Record<string, number | string>) => string;

export function agentSkillTitle(id: string, t: Translate): string {
  return t(`agentSession.skills.${id}.title`);
}

/** Подпись просьбы со скиллом: «Выровнять загрузку · Только сдвигать». */
export function agentSkillCaption(value: AgentSessionSkill, t: Translate): string {
  const skill = findAgentSkill(value.id);
  const choices = (skill?.params ?? []).flatMap((param) => {
    const choice = value.params[param.id];
    return choice ? [t(`agentSession.skills.${value.id}.params.${param.id}.choices.${choice}`)] : [];
  });
  return [agentSkillTitle(value.id, t), ...choices].join(' · ');
}
