'use client';

import type { SlaBugSidebarStats } from '@/lib/slaBugs/sidebarStats';

import { BugsTabPriorityCharts } from './BugsTabPriorityCharts';
import { BugsTabSummaryCards } from './BugsTabSummaryCards';

interface BugsTabChartsProps {
  stats: SlaBugSidebarStats;
}

export function BugsTabCharts({ stats }: BugsTabChartsProps) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      <BugsTabSummaryCards stats={stats} />
      <BugsTabPriorityCharts
        arrived={stats.arrivedThisWeek}
        closed={stats.closedThisWeek}
      />
    </div>
  );
}
