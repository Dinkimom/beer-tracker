'use client';

import { useMemo } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { useTaskSidebar } from '@/features/sidebar/contexts/TaskSidebarContext';
import { useSlaBugs } from '@/features/sla-bugs/hooks/useSlaBugs';
import { filterTasksNotOnSwimlane } from '@/features/task/utils/filterTasksNotOnSwimlane';
import { classifyAndGroupSlaBugs } from '@/lib/slaBugs';
import { buildSlaBugQualityZoneSnapshot } from '@/lib/slaBugs/qualityZone';

import { BugsSection } from './BugsSection';
import { BugsTabCharts } from './BugsTabCharts';
import { BugsTabQualityZoneBanner } from './BugsTabQualityZoneBanner';

const SECTION_ORDER = ['take_now', 'watch', 'regular', 'review'] as const;

/**
 * SLA-баги Yandex Tracker. В сайдбаре планера показывается, когда провайдер
 * поддерживает вкладку (`supportsSlaBugs`).
 */
export function BugsTab() {
  const { t } = useI18n();
  const { selectedBoardId, selectedSprintId, taskPositions } = useTaskSidebar();
  const { data, isLoading, isError, refetch } = useSlaBugs(selectedBoardId, true);

  const visibleTasks = useMemo(
    () => filterTasksNotOnSwimlane(data?.tasks ?? [], taskPositions, selectedSprintId),
    [data?.tasks, selectedSprintId, taskPositions]
  );

  const grouped = useMemo(
    () => classifyAndGroupSlaBugs(visibleTasks),
    [visibleTasks]
  );

  const qualityZone = useMemo(
    () => buildSlaBugQualityZoneSnapshot(visibleTasks),
    [visibleTasks]
  );

  const totalCount =
    grouped.take_now.length +
    grouped.watch.length +
    grouped.regular.length +
    grouped.review.length;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-red-600 dark:text-red-400">{t('sidebar.bugsTab.loadError')}</p>
        <button
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          type="button"
          onClick={() => void refetch()}
        >
          {t('sidebar.bugsTab.retry')}
        </button>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-y-auto px-4 py-4">
      <BugsTabQualityZoneBanner
        needToClose={qualityZone.needToClose}
        zone={qualityZone.zone}
      />

      {stats ? <BugsTabCharts stats={stats} /> : null}

      {totalCount === 0 ? (
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          {t('sidebar.bugsTab.empty')}
        </p>
      ) : null}

      {data?.truncated ? (
        <p className="mb-3 text-[11px] text-amber-700 dark:text-amber-300">
          {t('sidebar.bugsTab.truncated')}
        </p>
      ) : null}

      {SECTION_ORDER.map((section) => (
        <BugsSection
          key={section}
          boardId={selectedBoardId}
          bugs={grouped[section]}
          collapsedByDefault={totalCount === 0 ? section !== 'watch' : section === 'regular'}
          section={section}
        />
      ))}
    </div>
  );
}
