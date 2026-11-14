'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Icon } from '@/components/Icon';
import { SearchInput } from '@/components/SearchInput';
import { useI18n } from '@/contexts/LanguageContext';
import { searchIssues } from '@/lib/beerTrackerApi';

interface QuarterlyPlanTrackerEpicSearchProps {
  boardId: number;
  usedIssueKeys: ReadonlySet<string>;
  onPick: (issueKey: string, title: string) => void;
}

/** Поиск эпика в трекере: тот же поиск родителей, что у пикера на доске спринта. */
export function QuarterlyPlanTrackerEpicSearch({
  boardId,
  usedIssueKeys,
  onPick,
}: QuarterlyPlanTrackerEpicSearchProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const { data: results = [], isFetching } = useQuery({
    placeholderData: (previous) => previous,
    queryFn: () => searchIssues(query, boardId, { parentCandidates: true }),
    queryKey: ['quarterlyPlanEpicSearch', boardId, query],
  });

  return (
    <div className="flex flex-col gap-2">
      <SearchInput
        autoFocus
        placeholder={t('quarterlyPlan.link.searchPlaceholder')}
        value={query}
        onChange={setQuery}
      />
      {/* Высота постоянная: диалог по центру экрана не прыгает, пока меняется выдача. */}
      <div className="scrollbar-thin-custom flex h-72 flex-col gap-0.5 overflow-y-auto">
        {results.map((result) => (
          <button
            key={result.key}
            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-gray-900 transition-colors hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:bg-black/10 disabled:pointer-events-none disabled:opacity-50 dark:text-gray-100 dark:hover:bg-white/10 dark:active:bg-white/15"
            disabled={usedIssueKeys.has(result.key)}
            type="button"
            onClick={() => onPick(result.key, result.summary)}
          >
            <span className="shrink-0 font-mono text-[11px] text-ds-text-muted">{result.key}</span>
            <span className="min-w-0 flex-1 truncate">{result.summary}</span>
            {usedIssueKeys.has(result.key) ? (
              <span className="shrink-0 text-xs text-ds-text-muted">{t('quarterlyPlan.link.alreadyInPlan')}</span>
            ) : null}
          </button>
        ))}
        {results.length === 0 ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-ds-text-muted">
            {isFetching ? <Icon className="h-4 w-4 animate-spin" name="spinner" /> : null}
            {isFetching ? null : t('quarterlyPlan.link.nothingFound')}
          </div>
        ) : null}
      </div>
    </div>
  );
}
