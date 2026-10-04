import { describe, expect, it } from 'vitest';

import { getSidebarOpacityGroupClasses } from './taskCardLayoutHelpers';

describe('getSidebarOpacityGroupClasses', () => {
  it('keeps the light-theme wash and full color in dark theme', () => {
    expect(getSidebarOpacityGroupClasses('sidebar', false)).toBe('opacity-80 dark:opacity-100 group');
  });

  it('does not wash cards dimmed by the context menu', () => {
    expect(getSidebarOpacityGroupClasses('sidebar', true)).toBe('group');
  });

  it('does not fade swimlane cards', () => {
    expect(getSidebarOpacityGroupClasses('swimlane', false)).toBe('');
  });
});
