'use client';

import type { QuickAddIssueSearchResult } from './types';
import type { Task } from '@/types';
import type { ReactNode } from 'react';

import { useEffect } from 'react';

import { Icon } from '@/components/Icon';
import { OverflowTooltip } from '@/components/OverflowTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { MENU_ROW, MENU_ROW_OPEN, MENU_ROW_STACK } from '@/features/context-menu/contextMenuClasses';

import {
  isClosedQuickAddIssue,
  quickAddSearchOptionId,
  splitHighlightedText,
} from './quickAddMenuIssueSearch';

function renderHighlightedText(text: string, query: string): ReactNode {
  return splitHighlightedText(text, query).map((part, index) =>
    part.match ? (
      <mark key={index} className="rounded-sm bg-blue-500/20 text-inherit dark:bg-blue-400/25">
        {part.text}
      </mark>
    ) : (
      <span key={index}>{part.text}</span>
    )
  );
}

/** Строка как у меню задачи; активная (стрелки/ховер) — фон «открыто», без отдельного ховера. */
function resultRowClass(isActive: boolean): string {
  return isActive ? `${MENU_ROW} ${MENU_ROW_OPEN}` : MENU_ROW;
}

interface QuickAddIssueSearchResultsProps {
  activeIndex: number;
  isSearching: boolean;
  isSubmitting: boolean;
  listId: string;
  searchQuery: string;
  visibleResults: QuickAddIssueSearchResult[];
  onActiveIndexChange: (index: number) => void;
  onSelectExisting: (task: Task) => void;
}

export function QuickAddIssueSearchResults({
  activeIndex,
  isSearching,
  isSubmitting,
  listId,
  searchQuery,
  visibleResults,
  onActiveIndexChange,
  onSelectExisting,
}: QuickAddIssueSearchResultsProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (isSearching || visibleResults.length === 0) {
      return;
    }
    document
      .getElementById(quickAddSearchOptionId(listId, activeIndex))
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isSearching, listId, visibleResults.length]);

  if (isSearching) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500 dark:text-gray-400" id={listId}>
        <Icon className="h-4 w-4 animate-spin" name="spinner" />
        {t('sprintPlanner.swimlane.quickAddMenu.searching')}
      </div>
    );
  }

  if (visibleResults.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400" id={listId}>
        {t('sprintPlanner.swimlane.quickAddMenu.noResults')}
      </p>
    );
  }

  return (
    <ul
      aria-label={t('sprintPlanner.swimlane.quickAddMenu.searchResults')}
      className={MENU_ROW_STACK}
      id={listId}
      role="listbox"
    >
      {visibleResults.map((item, index) => {
        const isActive = index === activeIndex;
        const isClosed = isClosedQuickAddIssue(item.task);
        return (
          <li key={item.key} role="presentation">
            <button
              aria-selected={isActive}
              className={resultRowClass(isActive)}
              disabled={isSubmitting}
              id={quickAddSearchOptionId(listId, index)}
              role="option"
              type="button"
              onClick={() => onSelectExisting(item.task)}
              onMouseEnter={() => onActiveIndexChange(index)}
            >
              <OverflowTooltip content={item.key}>
              <span className="w-[4.75rem] shrink-0 truncate text-xs tabular-nums text-gray-500 dark:text-gray-400">
                {renderHighlightedText(item.key, searchQuery)}
              </span>
              </OverflowTooltip>
              <OverflowTooltip content={item.summary}>
              <span className="min-w-0 flex-1 truncate text-gray-900 dark:text-gray-100">
                {renderHighlightedText(item.summary, searchQuery)}
              </span>
              </OverflowTooltip>
              {isClosed ? (
                <span className="shrink-0 rounded bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
                  {t('sprintPlanner.swimlane.quickAddMenu.closedIssue')}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
