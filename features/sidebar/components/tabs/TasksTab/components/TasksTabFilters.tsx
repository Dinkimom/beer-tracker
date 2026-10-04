/**
 * Компонент фильтров для TasksTab
 * Высота и типографика кнопок совпадают с SearchInput size="sm" (py-1.5 text-xs rounded-md).
 * Категория и группировка — в один ряд; при нехватке ширины группировка переносится (flex-wrap).
 */

'use client';

import type { SidebarGroupBy, SidebarTasksTab, StatusFilter } from '@/types';

import { useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { SearchInput } from '@/components/SearchInput';
import { useI18n } from '@/contexts/LanguageContext';

interface TasksTabFiltersProps {
  activeTab: SidebarTasksTab;
  allTasksCount: number;
  devTasksCount: number;
  groupBy: SidebarGroupBy;
  nameFilter: string;
  qaTasksCount: number;
  statusFilter: StatusFilter;
  setActiveTab: (value: SidebarTasksTab) => void;
  setGroupBy: (value: SidebarGroupBy) => void;
  setNameFilter: (value: string) => void;
  setStatusFilter: (value: StatusFilter) => void;
}

const sectionLabelClass =
  'block text-[9px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1';

const chipButtonClass = 'shrink-0 px-2 py-1.5 text-xs leading-none';
const chipButtonWithBadgeClass = 'shrink-0 gap-1 px-2 py-1.5 text-xs leading-none';
/** В тёмной теме accent слишком бледный на сером чипе: усиливаем заливку, кромку и текст. */
const selectedChipClass =
  'dark:!border-blue-300/70 dark:!bg-blue-500/30 dark:!text-blue-50';
const countBadgeClass =
  'rounded px-1 py-px text-[10px] font-medium leading-none text-current tabular-nums opacity-80';

const choiceRowClass =
  'flex flex-nowrap gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin]';

const STATUS_SUMMARY_KEY: Partial<Record<StatusFilter, string>> = {
  active: 'sidebar.tasksTab.status.active.label',
  completed: 'sidebar.tasksTab.status.completed.label',
};

const GROUP_SUMMARY_KEY: Partial<Record<SidebarGroupBy, string>> = {
  assignee: 'sidebar.tasksTab.group.assignee.label',
  parent: 'sidebar.tasksTab.group.parent.label',
};

const CATEGORY_SUMMARY: Partial<Record<SidebarTasksTab, string>> = {
  dev: 'Dev',
  qa: 'QA',
};

function tasksTabActiveFilterSummary(
  t: (key: string) => string,
  statusFilter: StatusFilter,
  activeTab: SidebarTasksTab,
  groupBy: SidebarGroupBy
): string {
  const statusKey = STATUS_SUMMARY_KEY[statusFilter];
  const groupKey = GROUP_SUMMARY_KEY[groupBy];
  return [statusKey ? t(statusKey) : null, CATEGORY_SUMMARY[activeTab], groupKey ? t(groupKey) : null]
    .filter((part) => part != null)
    .join(' · ');
}

export function TasksTabFilters({
  nameFilter,
  setNameFilter,
  activeTab,
  setActiveTab,
  allTasksCount,
  devTasksCount,
  qaTasksCount,
  groupBy,
  setGroupBy,
  statusFilter,
  setStatusFilter,
}: TasksTabFiltersProps) {
  const { t } = useI18n();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeSummary = tasksTabActiveFilterSummary(t, statusFilter, activeTab, groupBy);

  return (
    <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50/80 px-4 pb-2 pt-4 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="space-y-2">
        <section aria-label={t('sidebar.tasksTab.searchAria')}>
          <SearchInput
            placeholder={t('sidebar.tasksTab.searchPlaceholder')}
            size="sm"
            value={nameFilter}
            onChange={setNameFilter}
          />
        </section>

        <button
          aria-controls="sidebar-task-filters"
          aria-expanded={filtersOpen}
          aria-label={
            filtersOpen
              ? t('sidebar.tasksTab.filtersCollapseAria')
              : t('sidebar.tasksTab.filtersExpandAria')
          }
          className="group flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-gray-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:hover:bg-gray-700/70"
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <Icon
            className="h-3.5 w-3.5 shrink-0 text-gray-400 transition-colors group-hover:text-gray-700 dark:text-gray-500 dark:group-hover:text-gray-200"
            name={filtersOpen ? 'chevron-down' : 'chevron-right'}
          />
          <span className="text-xs font-medium text-gray-600 transition-colors group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-100">
            {t('sidebar.tasksTab.filtersToggle')}
          </span>
          {!filtersOpen && activeSummary ? (
            <span className="min-w-0 truncate text-xs text-gray-400 transition-colors group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300">
              {activeSummary}
            </span>
          ) : null}
        </button>

        {filtersOpen ? (
          <div className="space-y-2" id="sidebar-task-filters">
            <section aria-label={t('sidebar.tasksTab.statusSectionAria')}>
              <span className={sectionLabelClass}>{t('sidebar.tasksTab.statusHeading')}</span>
              <div
                className="flex flex-nowrap gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin]"
                role="group"
              >
                {(
                  [
                    {
                      id: 'all' as const,
                      label: t('sidebar.tasksTab.status.all.label'),
                      title: t('sidebar.tasksTab.status.all.title'),
                    },
                    {
                      id: 'active' as const,
                      label: t('sidebar.tasksTab.status.active.label'),
                      title: t('sidebar.tasksTab.status.active.title'),
                    },
                    {
                      id: 'completed' as const,
                      label: t('sidebar.tasksTab.status.completed.label'),
                      title: t('sidebar.tasksTab.status.completed.title'),
                    },
                  ] as const
                ).map(({ id, label, title }) => {
                  const isOn = statusFilter === id;
                  return (
                    <Button
                      key={id}
                      className={`${chipButtonClass} ${isOn ? selectedChipClass : ''}`}
                      title={title}
                      type="button"
                      variant={isOn ? 'accent' : 'outline'}
                      onClick={() => setStatusFilter(id)}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </section>

            <div className="flex min-w-0 w-full flex-row flex-wrap items-end gap-x-4 gap-y-2">
              <section
                aria-label={t('sidebar.tasksTab.categorySectionAria')}
                className="flex min-w-0 shrink-0 flex-col"
              >
                <span className={sectionLabelClass}>{t('sidebar.tasksTab.categoryHeading')}</span>
                <div className={choiceRowClass} role="tablist">
                  {(
                    [
                      {
                        id: 'all' as const,
                        label: t('sidebar.tasksTab.status.all.label'),
                        count: allTasksCount,
                      },
                      { id: 'dev' as const, label: 'Dev', count: devTasksCount },
                      { id: 'qa' as const, label: 'QA', count: qaTasksCount },
                    ] as const
                  ).map(({ id, label, count }) => {
                    const isActive = activeTab === id;
                    return (
                      <Button
                        key={id}
                        aria-selected={isActive}
                        className={`${chipButtonWithBadgeClass} ${isActive ? selectedChipClass : ''}`}
                        role="tab"
                        type="button"
                        variant={isActive ? 'accent' : 'outline'}
                        onClick={() => setActiveTab(id)}
                      >
                        {label}
                        <span className={countBadgeClass}>{count}</span>
                      </Button>
                    );
                  })}
                </div>
              </section>

              <section
                aria-label={t('sidebar.tasksTab.groupSectionAria')}
                className="flex min-w-0 shrink-0 flex-col"
              >
                <span className={sectionLabelClass}>{t('sidebar.tasksTab.groupHeading')}</span>
                <div className={choiceRowClass} role="group">
                  {(
                    [
                      {
                        id: 'none' as const,
                        label: t('sidebar.tasksTab.group.none.label'),
                        title: t('sidebar.tasksTab.group.none.title'),
                      },
                      {
                        id: 'assignee' as const,
                        label: t('sidebar.tasksTab.group.assignee.label'),
                        title: t('sidebar.tasksTab.group.assignee.title'),
                      },
                      {
                        id: 'parent' as const,
                        label: t('sidebar.tasksTab.group.parent.label'),
                        title: t('sidebar.tasksTab.group.parent.title'),
                      },
                    ] as const
                  ).map(({ id, label, title }) => {
                    const isActive = groupBy === id;
                    return (
                      <Button
                        key={id}
                        className={`${chipButtonClass} ${isActive ? selectedChipClass : ''}`}
                        title={title}
                        type="button"
                        variant={isActive ? 'accent' : 'outline'}
                        onClick={() => setGroupBy(id)}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
