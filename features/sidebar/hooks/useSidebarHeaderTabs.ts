'use client';

import type { SidebarMainTab } from './useSidebarTabsState';
import type { SidebarTabSettings } from '@/hooks/useLocalStorage';
import type { ReactNode } from 'react';

import { useIssueTrackerProviderCapabilities } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';

import { isSidebarHeaderTabVisible, sidebarTabBadgeForId } from './useSidebarHeaderTabsHelpers';

type SidebarHeaderTabVariant =
  | 'amber'
  | 'blue'
  | 'emerald'
  | 'purple'
  | 'red'
  | 'violet';

interface SidebarHeaderTab {
  badge?: ReactNode;
  id: SidebarMainTab;
  label: string;
  title?: string;
  variant: SidebarHeaderTabVariant;
}

const SIDEBAR_TAB_VARIANTS: Record<SidebarMainTab, SidebarHeaderTabVariant> = {
  tasks: 'blue',
  invalid: 'red',
  goals: 'blue',
  daily: 'blue',
  metrics: 'emerald',
  backlog: 'blue',
  bugs: 'amber',
};

const DEFAULT_SIDEBAR_ORDER: SidebarMainTab[] = [
  'tasks',
  'invalid',
  'goals',
  'daily',
  'metrics',
  'bugs',
  'backlog',
];

function sidebarTabTitle(
  tabId: SidebarMainTab,
  t: (key: string) => string
): string | undefined {
  if (tabId === 'metrics') {
    return t('sidebar.tabTitles.metrics');
  }
  if (tabId === 'bugs') {
    return t('sidebar.tabTitles.bugs');
  }
  return undefined;
}

interface UseSidebarHeaderTabsProps {
  allTasksCount: number;
  bugsTasksCount: number;
  checklistDone: number;
  checklistTotal: number;
  hideBacklogTab?: boolean;
  hideTasksTab?: boolean;
  invalidTasksCount: number;
  sidebarTabsSettings: SidebarTabSettings[];
  sprintInfo: { id: number; status: string; version?: number } | null;
}

function resolveConfiguredSidebarIds(
  sidebarTabsSettings: SidebarTabSettings[]
): SidebarMainTab[] {
  if (sidebarTabsSettings.length === 0) {
    return DEFAULT_SIDEBAR_ORDER;
  }
  const ids = sidebarTabsSettings
    .map((tab) => tab.id)
    .filter((id) => SIDEBAR_TAB_VARIANTS[id]) as SidebarMainTab[];
  const known = new Set(ids);
  const missing = DEFAULT_SIDEBAR_ORDER.filter((id) => !known.has(id));
  return missing.length > 0 ? [...ids, ...missing] : ids;
}

export function useSidebarHeaderTabs({
  allTasksCount,
  checklistDone,
  checklistTotal,
  hideBacklogTab = false,
  hideTasksTab = false,
  invalidTasksCount,
  bugsTasksCount,
  sidebarTabsSettings,
  sprintInfo,
}: UseSidebarHeaderTabsProps): SidebarHeaderTab[] {
  const { t } = useI18n();
  const { supportsSlaBugs } = useIssueTrackerProviderCapabilities();
  const configuredSidebarIds = resolveConfiguredSidebarIds(sidebarTabsSettings);

  const visibilityMap = new Map(
    sidebarTabsSettings.map((s) => [s.id, s.visible])
  );

  return configuredSidebarIds
    .filter((id) => SIDEBAR_TAB_VARIANTS[id])
    .map((id) => {
      const visible = visibilityMap.get(id) ?? true;
      return {
        id,
        label: t(`sidebar.tabs.${id}`),
        variant: SIDEBAR_TAB_VARIANTS[id],
        visible,
      };
    })
    .filter((tab) =>
      isSidebarHeaderTabVisible({
        bugsTabEnabled: supportsSlaBugs,
        hideBacklogTab,
        hideTasksTab,
        sprintInfo,
        tabId: tab.id,
        visible: tab.visible,
      })
    )
    .map((tab) => ({
      id: tab.id,
      label: tab.label,
      variant: tab.variant,
      badge: sidebarTabBadgeForId(tab.id, {
        allTasksCount,
        checklistDone,
        checklistTotal,
        invalidTasksCount,
        bugsTasksCount,
      }),
      title: sidebarTabTitle(tab.id, t),
    }));
}
