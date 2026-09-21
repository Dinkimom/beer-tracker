'use client';

import type { SidebarMainTab } from '@/features/sidebar/hooks/useSidebarTabsState';

import dynamic from 'next/dynamic';

import { useIssueTrackerProviderCapabilities } from '@/contexts/IssueTrackerProviderKindContext';
import { TasksTab } from '@/features/sidebar/components/tabs/TasksTab';
import { SIDEBAR_INVALID_TAB_ENABLED } from '@/features/sidebar/hooks/useSidebarHeaderTabsHelpers';

const BacklogTab = dynamic(
  () => import('@/features/sidebar/components/tabs/BacklogTab').then((mod) => mod.BacklogTab),
  { ssr: false }
);
const BugsTab = dynamic(
  () => import('@/features/sidebar/components/tabs/BugsTab/BugsTab').then((mod) => mod.BugsTab),
  { ssr: false }
);
const DailyTab = dynamic(
  () => import('@/features/sidebar/components/tabs/DailyTab').then((mod) => mod.DailyTab),
  { ssr: false }
);
const GoalsTab = dynamic(
  () => import('@/features/sidebar/components/tabs/GoalsTab').then((mod) => mod.GoalsTab),
  { ssr: false }
);
const InvalidTab = dynamic(
  () => import('@/features/sidebar/components/tabs/InvalidTab').then((mod) => mod.InvalidTab),
  { ssr: false }
);
const MetricsTab = dynamic(
  () => import('@/features/sidebar/components/tabs/MetricsTab').then((mod) => mod.MetricsTab),
  { ssr: false }
);

const SCROLLABLE_MAIN_TABS: SidebarMainTab[] = [
  'invalid',
  'tasks',
  'backlog',
  'goals',
  'daily',
  'metrics',
  'bugs',
];

interface SidebarTabContentProps {
  hideBacklogTab?: boolean;
  mainTab: SidebarMainTab;
}

export function SidebarTabContent({
  hideBacklogTab = false,
  mainTab,
}: SidebarTabContentProps) {
  const { supportsSlaBugs } = useIssueTrackerProviderCapabilities();
  const isScrollable = SCROLLABLE_MAIN_TABS.includes(mainTab);
  const contentClassName = `flex-1 min-h-0 bg-white dark:bg-gray-800 ${
    isScrollable ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
  }`;

  return (
    <div className={contentClassName}>
      {mainTab === 'tasks' && <TasksTab />}
      {mainTab === 'metrics' && <MetricsTab />}
      {mainTab === 'goals' && <GoalsTab />}
      {mainTab === 'daily' && <DailyTab />}
      {SIDEBAR_INVALID_TAB_ENABLED && mainTab === 'invalid' && <InvalidTab />}
      {mainTab === 'backlog' && !hideBacklogTab && <BacklogTab />}
      {supportsSlaBugs && mainTab === 'bugs' && <BugsTab />}
    </div>
  );
}
