'use client';

import type { AgentSessionSkill } from '@/lib/agentSessions/agentSkills';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { AGENT_SKILLS, defaultAgentSkillParams } from '@/lib/agentSessions/agentSkills';

import { agentSkillTitle } from '../utils/agentSkillCaption';

const SKILL_BUTTON_CLASS =
  'flex min-w-0 cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-left transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] active:bg-gray-100 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:active:bg-white/[0.09]';

/** Готовые сценарии в пустом чате: выбор скилла вместо формулировки с нуля. */
export function AgentSkillPicker({ onPick }: { onPick: (skill: AgentSessionSkill) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-1.5" data-agent-skill-picker="">
      <p className="px-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">{t('agentSession.skillsTitle')}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {AGENT_SKILLS.map((skill) => (
          <button
            key={skill.id}
            className={SKILL_BUTTON_CLASS}
            data-agent-skill={skill.id}
            type="button"
            onClick={() => onPick({ id: skill.id, params: defaultAgentSkillParams(skill) })}
          >
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-700 dark:text-green-400" name={skill.icon} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">
                {agentSkillTitle(skill.id, t)}
              </span>
              <span className="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                {t(`agentSession.skills.${skill.id}.description`)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
