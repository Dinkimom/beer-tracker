'use client';

import type { TaskParent } from '@/types';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { formatContextMenuParentLabel } from '@/features/context-menu/utils/buildContextMenuParentOptions';

interface ParentSubmenuOptionsListProps {
  currentKey: string;
  isLoading: boolean;
  isSearching: boolean;
  showEmptyLocalHint: boolean;
  showNoResults: boolean;
  visibleParents: TaskParent[];
  onSelect: (parent: TaskParent | null) => void;
}

export function ParentSubmenuOptionsList({
  currentKey,
  isLoading,
  isSearching,
  onSelect,
  showEmptyLocalHint,
  showNoResults,
  visibleParents,
}: ParentSubmenuOptionsListProps) {
  const { t } = useI18n();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <Button
        className={`flex h-auto min-h-0 w-full items-center gap-2 rounded-none border-0 bg-transparent px-4 py-2.5 text-left text-sm shadow-none hover:!bg-gray-50 dark:hover:!bg-gray-700 ${
          !currentKey
            ? 'font-medium text-blue-700 dark:text-blue-300'
            : 'text-gray-700 dark:text-gray-300'
        }`}
        disabled={isLoading}
        type="button"
        variant="ghost"
        onClick={() => onSelect(null)}
      >
        <span className="min-w-0 flex-1 truncate">
          {t('sprintPlanner.contextMenu.parentNone')}
        </span>
        {!currentKey ? (
          <Icon className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" name="check" />
        ) : null}
      </Button>
      {isSearching ? (
        <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
          <Icon className="h-4 w-4 animate-spin" name="spinner" />
          {t('sprintPlanner.contextMenu.parentSearching')}
        </div>
      ) : null}
      {!isSearching && showEmptyLocalHint ? (
        <div className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
          {t('sprintPlanner.contextMenu.parentEmpty')}
        </div>
      ) : null}
      {!isSearching && showNoResults ? (
        <div className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
          {t('sprintPlanner.contextMenu.parentSearchNoResults')}
        </div>
      ) : null}
      {!isSearching
        ? visibleParents.map((parent) => {
            const isSelected = parent.key === currentKey;
            return (
              <Button
                key={parent.key}
                className={`flex h-auto min-h-0 w-full items-center gap-2 rounded-none border-0 bg-transparent px-4 py-2.5 text-left text-sm shadow-none hover:!bg-gray-50 dark:hover:!bg-gray-700 ${
                  isSelected
                    ? 'font-medium text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
                disabled={isLoading}
                type="button"
                variant="ghost"
                onClick={() => onSelect(parent)}
              >
                <span className="min-w-0 flex-1 truncate">
                  {formatContextMenuParentLabel(parent)}
                </span>
                {isSelected ? (
                  <Icon
                    className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                    name="check"
                  />
                ) : null}
              </Button>
            );
          })
        : null}
    </div>
  );
}
