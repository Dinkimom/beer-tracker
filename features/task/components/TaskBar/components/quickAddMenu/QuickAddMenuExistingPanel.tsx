'use client';

import type { QuickAddIssueSearchResult } from './types';
import type { Task } from '@/types';

import { useId, useState, type KeyboardEvent, type RefObject } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
} from '@/features/context-menu/contextMenuClasses';

import { QuickAddIssueSearchResults } from './QuickAddIssueSearchResults';
import { quickAddSearchOptionId } from './quickAddMenuIssueSearch';
import {
  applyQuickAddSearchInputKey,
  resolveExistingIssueToSubmit,
} from './quickAddMenuKeyboard';

const SEARCH_INPUT_CLASS =
  'w-full rounded-md border border-gray-200 bg-white py-1.5 pl-2.5 pr-8 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:border-blue-400';

interface QuickAddMenuExistingPanelProps {
  isSearching: boolean;
  isSubmitting: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  showResultsPanel: boolean;
  visibleResults: QuickAddIssueSearchResult[];
  onSearchQueryChange: (value: string) => void;
  onSelectExisting: (task: Task) => void;
}

export function QuickAddMenuExistingPanel({
  isSearching,
  isSubmitting,
  searchInputRef,
  searchQuery,
  showResultsPanel,
  visibleResults,
  onSearchQueryChange,
  onSelectExisting,
}: QuickAddMenuExistingPanelProps) {
  const { t } = useI18n();
  const searchInputId = useId();
  const listId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const safeActiveIndex =
    visibleResults.length === 0 ? 0 : Math.min(activeIndex, visibleResults.length - 1);
  const canPickResult = showResultsPanel && !isSearching && visibleResults.length > 0;
  const activeOptionId = canPickResult ? quickAddSearchOptionId(listId, safeActiveIndex) : undefined;

  const handleQueryChange = (value: string) => {
    setActiveIndex(0);
    onSearchQueryChange(value);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const action = applyQuickAddSearchInputKey({
      activeIndex: safeActiveIndex,
      isSearching,
      isSubmitting,
      key: event.key,
      resultCount: visibleResults.length,
    });
    if (!action) {
      return;
    }
    if (action.type === 'move') {
      event.preventDefault();
      setActiveIndex(action.index);
      return;
    }
    const task = resolveExistingIssueToSubmit(visibleResults, isSearching, safeActiveIndex);
    if (!task) {
      return;
    }
    event.preventDefault();
    onSelectExisting(task);
  };

  return (
    <div className="px-3 py-3">
      <div className="relative">
        <input
          ref={searchInputRef}
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          aria-controls={showResultsPanel ? listId : undefined}
          aria-describedby={showResultsPanel ? undefined : `${searchInputId}-hint`}
          aria-expanded={showResultsPanel}
          autoComplete="off"
          className={SEARCH_INPUT_CLASS}
          disabled={isSubmitting}
          id={searchInputId}
          placeholder={t('sprintPlanner.swimlane.quickAddMenu.searchPlaceholder')}
          role="combobox"
          spellCheck={false}
          type="text"
          value={searchQuery}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
        {searchQuery ? (
          <Button
            aria-label={t('sprintPlanner.swimlane.quickAddMenu.searchClear')}
            className={`absolute top-1/2 right-0.5 !h-7 !w-7 !min-h-0 !min-w-0 -translate-y-1/2 !justify-center !rounded-md !p-0 text-gray-500 dark:text-gray-400 ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
            disabled={isSubmitting}
            type="button"
            variant="ghost"
            onClick={() => {
              handleQueryChange('');
              searchInputRef.current?.focus();
            }}
          >
            <Icon className="h-3.5 w-3.5" name="x" />
          </Button>
        ) : null}
      </div>
      {showResultsPanel ? (
        <div className="mt-2 max-h-52 overflow-y-auto">
          <QuickAddIssueSearchResults
            activeIndex={safeActiveIndex}
            isSearching={isSearching}
            isSubmitting={isSubmitting}
            listId={listId}
            searchQuery={searchQuery}
            visibleResults={visibleResults}
            onActiveIndexChange={setActiveIndex}
            onSelectExisting={onSelectExisting}
          />
        </div>
      ) : (
        <p
          className="mt-2 text-sm leading-5 text-gray-500 dark:text-gray-400"
          id={`${searchInputId}-hint`}
        >
          {t('sprintPlanner.swimlane.quickAddMenu.existingHint')}
        </p>
      )}
    </div>
  );
}
