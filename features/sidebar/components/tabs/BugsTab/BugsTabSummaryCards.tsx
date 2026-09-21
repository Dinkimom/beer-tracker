'use client';

import type { SlaBugSidebarStats } from '@/lib/slaBugs/sidebarStats';

import { useI18n } from '@/contexts/LanguageContext';

import { BugsTabSummaryCard } from './BugsTabSummaryCard';

interface BugsTabSummaryCardsProps {
  stats: SlaBugSidebarStats;
}

export function BugsTabSummaryCards({ stats }: BugsTabSummaryCardsProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-3 gap-2">
      <BugsTabSummaryCard
        subtitle={t('sidebar.bugsTab.charts.arrivedSubtitle')}
        title={t('sidebar.bugsTab.charts.arrivedThisWeek')}
        value={stats.arrivedThisWeek.total}
      />
      <BugsTabSummaryCard
        subtitle={t('sidebar.bugsTab.charts.closedSubtitle')}
        title={t('sidebar.bugsTab.charts.closedThisWeek')}
        value={stats.closedThisWeek.total}
      />
      <BugsTabSummaryCard
        subtitle={t('sidebar.bugsTab.charts.slaRiskSubtitle')}
        title={t('sidebar.bugsTab.charts.slaRisk')}
        value={stats.slaRiskCount}
      />
    </div>
  );
}
