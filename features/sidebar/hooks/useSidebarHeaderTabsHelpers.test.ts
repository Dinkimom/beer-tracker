import { describe, expect, it } from 'vitest';

import {
  SIDEBAR_INVALID_TAB_ENABLED,
  isSidebarHeaderTabVisible,
  resolveHiddenSidebarTabFallback,
} from './useSidebarHeaderTabsHelpers';

const sprintInfo = { id: 1, status: 'active', version: 1 };

const visibilityBase = {
  bugsTabEnabled: false,
  hideBacklogTab: false,
  hideTasksTab: false,
  sprintInfo,
  visible: true,
} as const;

describe('SIDEBAR_INVALID_TAB_ENABLED', () => {
  it('stays off until invalid-task rules are configurable instead of hardcoded', () => {
    expect(SIDEBAR_INVALID_TAB_ENABLED).toBe(false);
  });
});

describe('isSidebarHeaderTabVisible', () => {
  it('hides the bugs tab when SLA bugs are unsupported even if settings keep it visible', () => {
    expect(
      isSidebarHeaderTabVisible({
        ...visibilityBase,
        tabId: 'bugs',
      })
    ).toBe(false);
  });

  it('shows the bugs tab when SLA bugs are supported and settings keep it visible', () => {
    expect(
      isSidebarHeaderTabVisible({
        ...visibilityBase,
        bugsTabEnabled: true,
        tabId: 'bugs',
      })
    ).toBe(true);
  });

  it('hides the invalid tab even when settings keep it visible', () => {
    expect(
      isSidebarHeaderTabVisible({
        ...visibilityBase,
        tabId: 'invalid',
      })
    ).toBe(false);
  });

  it('keeps the tasks tab visible by default', () => {
    expect(
      isSidebarHeaderTabVisible({
        ...visibilityBase,
        tabId: 'tasks',
      })
    ).toBe(true);
  });
});

describe('resolveHiddenSidebarTabFallback', () => {
  it('redirects the bugs tab to tasks while SLA bugs are unsupported', () => {
    expect(
      resolveHiddenSidebarTabFallback({
        bugsTabEnabled: false,
        hideBacklogTab: false,
        hideTasksTab: false,
        mainTab: 'bugs',
      })
    ).toBe('tasks');
  });

  it('keeps the bugs tab when SLA bugs are supported', () => {
    expect(
      resolveHiddenSidebarTabFallback({
        bugsTabEnabled: true,
        hideBacklogTab: false,
        hideTasksTab: false,
        mainTab: 'bugs',
      })
    ).toBe(null);
  });

  it('redirects the invalid tab to tasks while it is disabled', () => {
    expect(
      resolveHiddenSidebarTabFallback({
        bugsTabEnabled: false,
        hideBacklogTab: false,
        hideTasksTab: false,
        mainTab: 'invalid',
      })
    ).toBe('tasks');
  });

  it('redirects hidden tasks to backlog, or goals when backlog is also hidden', () => {
    expect(
      resolveHiddenSidebarTabFallback({
        bugsTabEnabled: false,
        hideBacklogTab: false,
        hideTasksTab: true,
        mainTab: 'tasks',
      })
    ).toBe('backlog');
    expect(
      resolveHiddenSidebarTabFallback({
        bugsTabEnabled: false,
        hideBacklogTab: true,
        hideTasksTab: true,
        mainTab: 'tasks',
      })
    ).toBe('goals');
  });

  it('redirects hidden backlog to tasks', () => {
    expect(
      resolveHiddenSidebarTabFallback({
        bugsTabEnabled: false,
        hideBacklogTab: true,
        hideTasksTab: false,
        mainTab: 'backlog',
      })
    ).toBe('tasks');
  });
});
