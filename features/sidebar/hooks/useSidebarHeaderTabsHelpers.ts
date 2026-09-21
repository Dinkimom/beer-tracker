import type { SidebarMainTab } from './useSidebarTabsState';
import type { ReactNode } from 'react';

/**
 * Вкладка «Невалидные» временно скрыта: сейчас условие невалидности захардкожено
 * (`validateTask` / `collectInvalidSprintDevTasks`).
 * Когда появится настройка «что считать невалидной задачей», флаг можно включить.
 */
export const SIDEBAR_INVALID_TAB_ENABLED = false;

interface SidebarTabCounts {
  allTasksCount: number;
  bugsTasksCount: number;
  checklistDone: number;
  checklistTotal: number;
  invalidTasksCount: number;
}

const TAB_COUNT_RESOLVERS: Record<
  SidebarMainTab,
  ((counts: SidebarTabCounts) => ReactNode | undefined) | undefined
> = {
  tasks: (counts) => (counts.allTasksCount > 0 ? counts.allTasksCount : undefined),
  invalid: (counts) => (counts.invalidTasksCount > 0 ? counts.invalidTasksCount : undefined),
  goals: (counts) =>
    counts.checklistTotal > 0 ? `${counts.checklistDone}/${counts.checklistTotal}` : undefined,
  bugs: (counts) => (counts.bugsTasksCount > 0 ? counts.bugsTasksCount : undefined),
  backlog: undefined,
  daily: undefined,
  metrics: undefined,
};

interface SidebarHeaderTabVisibilityParams {
  bugsTabEnabled: boolean;
  hideBacklogTab: boolean;
  hideTasksTab: boolean;
  sprintInfo: { id: number; status: string; version?: number } | null;
  tabId: SidebarMainTab;
}

const HIDDEN_TAB_FLAGS: Partial<
  Record<SidebarMainTab, (params: SidebarHeaderTabVisibilityParams) => boolean>
> = {
  tasks: (params) => params.hideTasksTab,
  backlog: (params) => params.hideBacklogTab,
  bugs: (params) => !params.bugsTabEnabled,
  invalid: () => !SIDEBAR_INVALID_TAB_ENABLED,
};

export function resolveHiddenSidebarTabFallback(params: {
  bugsTabEnabled: boolean;
  hideBacklogTab: boolean;
  hideTasksTab: boolean;
  mainTab: SidebarMainTab;
}): SidebarMainTab | null {
  if (!params.bugsTabEnabled && params.mainTab === 'bugs') {
    return 'tasks';
  }
  if (!SIDEBAR_INVALID_TAB_ENABLED && params.mainTab === 'invalid') {
    return 'tasks';
  }
  if (params.hideTasksTab && params.mainTab === 'tasks') {
    return params.hideBacklogTab ? 'goals' : 'backlog';
  }
  if (params.hideBacklogTab && params.mainTab === 'backlog') {
    return 'tasks';
  }
  return null;
}

const SPRINT_REQUIRED_TABS = new Set<SidebarMainTab>(['daily', 'goals', 'metrics']);

function isTabHiddenBySettings(params: SidebarHeaderTabVisibilityParams): boolean {
  return HIDDEN_TAB_FLAGS[params.tabId]?.(params) ?? false;
}

function isTabBlockedWithoutSprint(params: SidebarHeaderTabVisibilityParams): boolean {
  return SPRINT_REQUIRED_TABS.has(params.tabId) && !params.sprintInfo;
}

export function sidebarTabBadgeForId(tabId: SidebarMainTab, counts: SidebarTabCounts): ReactNode | undefined {
  return TAB_COUNT_RESOLVERS[tabId]?.(counts);
}

export function isSidebarHeaderTabVisible(params: {
  bugsTabEnabled: boolean;
  hideBacklogTab: boolean;
  hideTasksTab: boolean;
  sprintInfo: { id: number; status: string; version?: number } | null;
  tabId: SidebarMainTab;
  visible: boolean;
}): boolean {
  if (!params.visible) return false;
  if (isTabHiddenBySettings(params)) return false;
  if (isTabBlockedWithoutSprint(params)) return false;
  return true;
}
