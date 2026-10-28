'use client';

import type { TaskParent } from '@/types';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { MENU_ROW, MENU_ROW_CHECK, MENU_ROW_STACK } from '@/features/context-menu/contextMenuClasses';
import { formatTaskParentLabel } from '@/features/swimlane/utils/featureDraftParentLabel';

interface ParentSubmenuOptionsListProps {
  currentKey: string;
  isLoading: boolean;
  isSearching: boolean;
  showEmptyLocalHint: boolean;
  showNoResults: boolean;
  visibleParents: TaskParent[];
  onSelect: (parent: TaskParent | null) => void;
}

const HINT_CLASS = 'px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400';

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
    <div className={MENU_ROW_STACK}>
      <Button
        aria-current={!currentKey || undefined}
        className={`${MENU_ROW} !text-gray-500 dark:!text-gray-400`}
        disabled={isLoading}
        type="button"
        variant="ghost"
        onClick={() => onSelect(null)}
      >
        <span className="min-w-0 flex-1 truncate">
          {t('sprintPlanner.contextMenu.parentNone')}
        </span>
        {!currentKey ? <Icon className={MENU_ROW_CHECK} name="check" /> : null}
      </Button>
      {isSearching ? (
        <div className={`flex items-center gap-2 ${HINT_CLASS}`}>
          <Icon className="h-4 w-4 shrink-0 animate-spin" name="spinner" />
          {t('sprintPlanner.contextMenu.parentSearching')}
        </div>
      ) : null}
      {!isSearching && showEmptyLocalHint ? (
        <div className={HINT_CLASS}>{t('sprintPlanner.contextMenu.parentEmpty')}</div>
      ) : null}
      {!isSearching && showNoResults ? (
        <div className={HINT_CLASS}>{t('sprintPlanner.contextMenu.parentSearchNoResults')}</div>
      ) : null}
      {!isSearching
        ? visibleParents.map((parent) => {
            const isSelected = parent.key === currentKey;
            return (
              <Button
                key={parent.key}
                aria-current={isSelected || undefined}
                className={MENU_ROW}
                disabled={isLoading}
                type="button"
                variant="ghost"
                onClick={() => onSelect(parent)}
              >
                <span className="min-w-0 flex-1 truncate">
                  {formatTaskParentLabel(parent)}
                </span>
                {isSelected ? <Icon className={MENU_ROW_CHECK} name="check" /> : null}
              </Button>
            );
          })
        : null}
    </div>
  );
}
