'use client';

import type { AGENT_SKILLS } from '@/lib/agentSessions/agentSkills';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

/** Список под «/»: скиллы агента с описанием; мышь не уводит фокус из поля ввода. */
export function AgentSkillCommandList({
  activeIndex,
  options,
  onHover,
  onSelect,
}: {
  activeIndex: number;
  options: typeof AGENT_SKILLS;
  onHover: (index: number) => void;
  onSelect: (skill: (typeof AGENT_SKILLS)[number]) => void;
}) {
  const { t } = useI18n();
  return (
    <ul
      aria-label={t('agentSession.skillsAria')}
      className="absolute inset-x-0 bottom-full z-10 mb-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
      data-agent-skill-commands=""
      role="listbox"
    >
      {options.map((skill, index) => (
        <li
          key={skill.id}
          aria-selected={index === activeIndex}
          className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
            index === activeIndex
              ? 'bg-blue-50 text-blue-900 dark:bg-blue-500/20 dark:text-blue-100'
              : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700'
          }`}
          role="option"
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(skill);
          }}
          onMouseEnter={() => onHover(index)}
        >
          <Icon className="h-3.5 w-3.5 shrink-0 text-green-700 dark:text-green-400" name={skill.icon} />
          <span className="shrink-0 font-medium">{t(`agentSession.skills.${skill.id}.title`)}</span>
          <span className="min-w-0 truncate text-gray-500 dark:text-gray-400">
            {t(`agentSession.skills.${skill.id}.description`)}
          </span>
        </li>
      ))}
    </ul>
  );
}
