'use client';

import type { AgentSessionSkill } from '@/lib/agentSessions/agentSkills';
import type { KeyboardEvent } from 'react';

import { useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { AGENT_SKILLS, agentSkillSlashQuery, defaultAgentSkillParams } from '@/lib/agentSessions/agentSkills';

type AgentSkillOption = (typeof AGENT_SKILLS)[number];

/**
 * «/» в начале поля просьбы агенту: список скиллов с поиском по названию и описанию, выбор стрелками /
 * Enter / Tab. Выбор стирает «/запрос» и отдаёт скилл с параметрами по умолчанию. Esc закрывает список,
 * пока запрос не изменится. `onSkillPick` нет — «/» обычный символ.
 */
export function useAgentComposerSkills(input: {
  text: string;
  onSkillPick?: (skill: AgentSessionSkill) => void;
  onTextChange: (text: string) => void;
}) {
  const { onSkillPick, onTextChange, text } = input;
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedText, setDismissedText] = useState<string | null>(null);

  const query = onSkillPick ? agentSkillSlashQuery(text) : null;
  const options = useMemo(() => {
    if (query == null) {
      return [];
    }
    const needle = query.toLowerCase();
    return AGENT_SKILLS.filter((skill) =>
      [skill.id, t(`agentSession.skills.${skill.id}.title`), t(`agentSession.skills.${skill.id}.description`)].some(
        (label) => label.toLowerCase().includes(needle)
      )
    );
  }, [query, t]);
  const isOpen = options.length > 0 && dismissedText !== text;

  const select = useCallback(
    (skill: AgentSkillOption) => {
      onTextChange('');
      onSkillPick?.({ id: skill.id, params: defaultAgentSkillParams(skill) });
      setActiveIndex(0);
    },
    [onSkillPick, onTextChange]
  );

  /** true — клавишу обработал список скиллов. */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (!isOpen) {
        return false;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((current) => (current + step + options.length) % options.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        const skill = options[activeIndex] ?? options[0];
        if (skill) {
          select(skill);
        }
        return true;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setDismissedText(text);
        return true;
      }
      return false;
    },
    [activeIndex, isOpen, options, select, text]
  );

  return {
    activeIndex: Math.min(activeIndex, Math.max(options.length - 1, 0)),
    handleKeyDown,
    isOpen,
    options,
    select,
    setActiveIndex,
  };
}
