'use client';

import type { AgentMentionCandidate, AgentMentionKind } from '@/lib/agentSessions/agentMentions';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

export const AGENT_MENTION_ICON: Record<AgentMentionKind, string> = {
  note: 'file-text',
  person: 'user',
  task: 'issue-task',
};

/** Список под «@»: задачи и люди; мышь не уводит фокус из поля ввода. */
export function AgentMentionList({
  activeIndex,
  options,
  onHover,
  onSelect,
}: {
  activeIndex: number;
  options: readonly AgentMentionCandidate[];
  onHover: (index: number) => void;
  onSelect: (candidate: AgentMentionCandidate) => void;
}) {
  const { t } = useI18n();
  return (
    <ul
      aria-label={t('agentSession.mentionsAria')}
      className="absolute inset-x-0 bottom-full z-10 mb-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
      role="listbox"
    >
      {options.map((option, index) => (
        <li
          key={`${option.kind}:${option.id}`}
          aria-selected={index === activeIndex}
          className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
            index === activeIndex
              ? 'bg-blue-50 text-blue-900 dark:bg-blue-500/20 dark:text-blue-100'
              : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700'
          }`}
          role="option"
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(option);
          }}
          onMouseEnter={() => onHover(index)}
        >
          <Icon className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" name={AGENT_MENTION_ICON[option.kind]} />
          <span className="shrink-0 font-medium">{option.label}</span>
          {option.hint ? (
            <span className="min-w-0 truncate text-gray-500 dark:text-gray-400">{option.hint}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
