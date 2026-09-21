/**
 * Компонент фильтров для TasksTab
 * Высота и типографика кнопок совпадают с SearchInput size="sm" (py-1.5 text-xs rounded-md).
 * Категория и группировка — в один ряд; при нехватке ширины группировка переносится (flex-wrap).
 */

'use client';

import type { SidebarGroupBy, SidebarTasksTab, StatusFilter } from '@/types';

import { Button } from '@/components/Button';
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

/** Nested count on primary chip — чуть плотнее soft primary (`blue-500/20`). */
const countBadgeActive = 'bg-blue-800/80 text-white dark:bg-blue-500/35 dark:text-blue-100';
const countBadgeIdle = 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200';

const choiceRowClass =
  'flex flex-nowrap gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin]';

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
  return (
    <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 px-4 py-2 dark:bg-gray-900/40">
      <div className="space-y-2">
        <section aria-label={t('sidebar.tasksTab.searchAria')}>
          <SearchInput
            placeholder={t('sidebar.tasksTab.searchPlaceholder')}
            size="sm"
            value={nameFilter}
            onChange={setNameFilter}
          />
        </section>

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
                  className={chipButtonClass}
                  title={title}
                  type="button"
                  variant={isOn ? 'primary' : 'outline'}
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
                    className={chipButtonWithBadgeClass}
                    role="tab"
                    type="button"
                    variant={isActive ? 'primary' : 'outline'}
                    onClick={() => setActiveTab(id)}
                  >
                    {label}
                    <span
                      className={`tabular-nums rounded px-1 py-px text-[10px] font-semibold leading-none ${
                        isActive ? countBadgeActive : countBadgeIdle
                      }`}
                    >
                      {count}
                    </span>
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
                    className={chipButtonClass}
                    title={title}
                    type="button"
                    variant={isActive ? 'primary' : 'outline'}
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
    </div>
  );
}
