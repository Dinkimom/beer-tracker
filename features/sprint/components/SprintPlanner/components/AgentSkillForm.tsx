'use client';

import type { AgentSessionSkill } from '@/lib/agentSessions/agentSkills';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { findAgentSkill } from '@/lib/agentSessions/agentSkills';

import { agentSkillTitle } from '../utils/agentSkillCaption';

const CHOICE_CLASS =
  'h-6 cursor-pointer rounded-md px-2 text-[11px] font-medium transition-all duration-200 active:scale-[0.98]';

const CHOICE_IDLE_CLASS =
  'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.1] dark:active:bg-white/[0.14]';

const CHOICE_SELECTED_CLASS =
  'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 dark:bg-green-500 dark:hover:bg-green-400';

/** Шапка поля ввода с выбранным скиллом: название (снимается ✕) и варианты параметров; без скилла — ничего. */
export function AgentSkillForm({
  value,
  onChange,
  onRemove,
}: {
  value: AgentSessionSkill | null;
  onChange: (value: AgentSessionSkill) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const skill = findAgentSkill(value?.id);
  if (!value || !skill) {
    return null;
  }
  return (
    <div className="flex flex-col gap-1.5 px-3 pt-2.5" data-agent-skill-form={skill.id}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-green-700 dark:text-green-400" name={skill.icon} />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
          {agentSkillTitle(skill.id, t)}
        </span>
        <button
          aria-label={t('agentSession.skillRemove')}
          className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-gray-400 transition-all duration-200 hover:bg-gray-500/[0.12] hover:text-gray-700 active:scale-[0.98] active:bg-gray-500/[0.2] dark:hover:bg-white/[0.08] dark:hover:text-gray-200"
          title={t('agentSession.skillRemove')}
          type="button"
          onClick={onRemove}
        >
          <Icon className="h-3 w-3" name="x" />
        </button>
      </div>
      {skill.params.map((param) => (
        <div key={param.id} className="flex flex-wrap items-center gap-1" role="radiogroup">
          <span className="mr-1 text-[11px] text-gray-500 dark:text-gray-400">
            {t(`agentSession.skills.${skill.id}.params.${param.id}.label`)}
          </span>
          {Object.keys(param.choices).map((choice) => {
            const selected = value.params[param.id] === choice;
            return (
              <button
                key={choice}
                aria-checked={selected}
                className={`${CHOICE_CLASS} ${selected ? CHOICE_SELECTED_CLASS : CHOICE_IDLE_CLASS}`}
                role="radio"
                type="button"
                onClick={() => onChange({ ...value, params: { ...value.params, [param.id]: choice } })}
              >
                {t(`agentSession.skills.${skill.id}.params.${param.id}.choices.${choice}`)}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
