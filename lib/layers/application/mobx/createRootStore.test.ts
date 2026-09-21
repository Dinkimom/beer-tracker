import { describe, expect, it } from 'vitest';

import { createRootStore } from './createRootStore';

describe('createRootStore', () => {
  it('creates sprintPlannerUi store with session id', () => {
    const root = createRootStore();
    expect(root.sprintPlannerUi.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
    );
  });

  it('resetSession assigns new id', () => {
    const root = createRootStore();
    const before = root.sprintPlannerUi.sessionId;
    root.sprintPlannerUi.resetSession();
    expect(root.sprintPlannerUi.sessionId).not.toBe(before);
  });

  it('setSidebarOpen supports functional updates', () => {
    const root = createRootStore();
    root.sprintPlannerUi.setSidebarOpen(false);
    expect(root.sprintPlannerUi.sidebarOpen).toBe(false);
    root.sprintPlannerUi.setSidebarOpen((prev) => !prev);
    expect(root.sprintPlannerUi.sidebarOpen).toBe(true);
  });
});
