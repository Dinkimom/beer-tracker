'use client';

import type { Developer } from '@/types';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';

function occupancyAssigneeFilterDisplayText(
  selectedAssigneeIds: Set<string>,
  sortedDevelopers: Developer[],
  t: (key: string, params?: Record<string, number | string>) => string
): string {
  if (selectedAssigneeIds.size === 0) {
    return t('sprintPlanner.occupancy.assigneeFilter.all');
  }
  if (selectedAssigneeIds.size === 1) {
    const id = Array.from(selectedAssigneeIds)[0];
    return (
      sortedDevelopers.find((d) => d.id === id)?.name ??
      t('sprintPlanner.occupancy.assigneeFilter.one')
    );
  }
  return t('sprintPlanner.occupancy.assigneeFilter.count', {
    count: selectedAssigneeIds.size,
  });
}

interface OccupancyAssigneeFilterProps {
  /** Ограничение ширины триггера в плотных тулбарах (truncate подписи) */
  className?: string;
  developers: Developer[];
  selectedAssigneeIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
}

export function OccupancyAssigneeFilter({
  developers,
  selectedAssigneeIds,
  className,
  onSelectionChange,
}: OccupancyAssigneeFilterProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Закрываем dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleToggle = (developerId: string) => {
    onSelectionChange((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(developerId)) {
        newSelection.delete(developerId);
      } else {
        newSelection.add(developerId);
      }
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    onSelectionChange(() => new Set(developers.map((d) => d.id)));
  };

  const handleClearAll = () => {
    onSelectionChange(() => new Set());
  };

  const { data: currentUser } = useCurrentUser();

  const sortedDevelopers = useMemo(() => {
    if (!currentUser) {
      return developers;
    }

    const trackerId = (currentUser.trackerUid ?? currentUser.uid)?.toString();
    if (!trackerId) {
      return developers;
    }

    const idx = developers.findIndex((d) => d.id === trackerId);
    if (idx === -1) {
      return developers;
    }

    const current = developers[idx];
    return [current, ...developers.slice(0, idx), ...developers.slice(idx + 1)];
  }, [developers, currentUser]);

  const displayText = occupancyAssigneeFilterDisplayText(
    selectedAssigneeIds,
    sortedDevelopers,
    t
  );

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className ?? ''}`}>
      <Button
        ref={buttonRef}
        className={`w-full max-w-full min-w-0 !h-8 !justify-start !gap-2 !px-3 !py-0 text-sm font-medium ${
          selectedAssigneeIds.size > 0 ? '' : 'hover:!bg-gray-50 dark:hover:!bg-gray-600'
        }`}
        type="button"
        variant={selectedAssigneeIds.size > 0 ? 'accent' : 'outline'}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Icon className="h-4 w-4 shrink-0" name="user" />
        <span className="min-w-0 flex-1 truncate text-left">{displayText}</span>
        <Icon
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          name="chevron-down"
        />
      </Button>

      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden rounded-lg shadow-lg ${ZIndex.class('dropdownContent')} flex flex-col min-w-[240px] max-h-96`}
          style={{ zIndex: ZIndex.dropdownContent }}
        >
          {/* Фиксированная шапка с кнопками "Выбрать все" и "Очистить" */}
          <div className="px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 flex gap-2 flex-shrink-0 bg-white dark:bg-gray-800 rounded-t-lg">
            <Button
              className="!min-h-0 !px-1 !py-0 text-sm font-medium text-blue-600 hover:!text-blue-700 hover:!bg-transparent dark:text-blue-400 dark:hover:!text-blue-300 dark:hover:!bg-transparent"
              type="button"
              variant="ghost"
              onClick={handleSelectAll}
            >
              {t('sprintPlanner.occupancy.assigneeFilter.selectAll')}
            </Button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Button
              className="!min-h-0 !px-1 !py-0 text-sm font-medium text-gray-600 hover:!text-gray-700 hover:!bg-transparent dark:text-gray-400 dark:hover:!text-gray-300 dark:hover:!bg-transparent"
              type="button"
              variant="ghost"
              onClick={handleClearAll}
            >
              {t('sprintPlanner.occupancy.assigneeFilter.clear')}
            </Button>
          </div>

          {/* Скроллируемый список исполнителей */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {sortedDevelopers.map((developer) => {
                const isSelected = selectedAssigneeIds.has(developer.id);
                return (
                  <label
                    key={developer.id}
                    className={`
                      flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                      ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
                    `}
                  >
                    <input
                      checked={isSelected}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                      type="checkbox"
                      onChange={() => handleToggle(developer.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm text-gray-900 dark:text-gray-100">
                        {developer.name}
                      </div>
                      {developer.roleTitle && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 first-letter:uppercase">
                          {developer.roleTitle}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
