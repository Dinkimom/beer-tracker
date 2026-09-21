'use client';

import type { SlaBugWeeklyBucketStats } from '@/lib/slaBugs/sidebarStats';

import { useI18n } from '@/contexts/LanguageContext';

import { PriorityBarChart } from './PriorityBarChart';

interface BugsTabPriorityChartsProps {
  arrived: SlaBugWeeklyBucketStats;
  closed: SlaBugWeeklyBucketStats;
}

export function BugsTabPriorityCharts({ arrived, closed }: BugsTabPriorityChartsProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-2 gap-2">
      <PriorityBarChart
        ariaLabel={t('sidebar.bugsTab.charts.arrivedChartAria')}
        bucket={arrived}
        title={t('sidebar.bugsTab.charts.arrivedChart')}
      />
      <PriorityBarChart
        ariaLabel={t('sidebar.bugsTab.charts.closedChartAria')}
        bucket={closed}
        title={t('sidebar.bugsTab.charts.closedChart')}
      />
    </div>
  );
}
