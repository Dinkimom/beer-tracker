import { describe, expect, it } from 'vitest';

import {
  SIDEBAR_INVALID_TAB_ENABLED,
  isSidebarHeaderTabVisible,
  resolveHiddenSidebarTabFallback,
} from './useSidebarHeaderTabsHelpers';

const sprintInfo = { id: 1, status: 'active', version: 1 };

const visibilityBase = {
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
  it('redirects the invalid tab to tasks while it is disabled', () => {
    expect(
      resolveHiddenSidebarTabFallback({
        hideTasksTab: false,
        mainTab: 'invalid',
      })
    ).toBe('tasks');
  });

  it('redirects hidden tasks to goals', () => {
    expect(
      resolveHiddenSidebarTabFallback({
        hideTasksTab: true,
        mainTab: 'tasks',
      })
    ).toBe('goals');
  });
});
