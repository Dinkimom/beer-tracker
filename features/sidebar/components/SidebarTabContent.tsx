'use client';

import type { SidebarMainTab } from '@/features/sidebar/hooks/useSidebarTabsState';

import dynamic from 'next/dynamic';

import { TasksTab } from '@/features/sidebar/components/tabs/TasksTab';
import { SIDEBAR_INVALID_TAB_ENABLED } from '@/features/sidebar/hooks/useSidebarHeaderTabsHelpers';

const GoalsTab = dynamic(
  () => import('@/features/sidebar/components/tabs/GoalsTab').then((mod) => mod.GoalsTab),
  { ssr: false }
);
const HistoryTab = dynamic(
  () => import('@/features/sidebar/components/tabs/HistoryTab').then((mod) => mod.HistoryTab),
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
  'goals',
  'metrics',
  'history',
];

interface SidebarTabContentProps {
  mainTab: SidebarMainTab;
}

export function SidebarTabContent({
  mainTab,
}: SidebarTabContentProps) {
  const isScrollable = SCROLLABLE_MAIN_TABS.includes(mainTab);
  const contentClassName = `flex-1 min-h-0 ${
    isScrollable ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
  }`;

  return (
    <div className={contentClassName}>
      {mainTab === 'tasks' && <TasksTab />}
      {mainTab === 'metrics' && <MetricsTab />}
      {mainTab === 'goals' && <GoalsTab />}
      {mainTab === 'history' && <HistoryTab />}
      {SIDEBAR_INVALID_TAB_ENABLED && mainTab === 'invalid' && <InvalidTab />}
    </div>
  );
}
