'use client';

import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useI18n } from '@/contexts/LanguageContext';
import { useRetroFacts } from '@/features/retro/hooks/useRetroFacts';

import { RetroFactsBody } from './RetroFactsBody';

export function RetroFactsBlock({
  completionRules,
  sprint,
  tasks,
  tasksPending,
}: {
  completionRules?: SprintTaskCompletionRules | null;
  sprint: SprintListItem | null;
  tasks: Task[] | undefined;
  tasksPending: boolean;
}) {
  const { language, t } = useI18n();
  const { error, facts, loading } = useRetroFacts({
    completionRules,
    sprint,
    tasks,
    tasksPending,
  });

  return (
    <div className="border-b border-gray-200 px-4 pt-4 pb-3 dark:border-gray-700">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {t('retro.facts.heading')}
      </h2>
      {loading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">{t('retro.facts.loading')}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-500 dark:text-red-400">{t('retro.facts.loadError')}</p>
      ) : null}
      {facts ? <RetroFactsBody facts={facts} language={language} /> : null}
    </div>
  );
}
