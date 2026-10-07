import { describe, expect, it } from 'vitest';

import { getSidebarOpacityGroupClasses, getTaskCardBorderClasses } from './taskCardLayoutHelpers';

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

describe('getTaskCardBorderClasses', () => {
  it('uses a hairline border so swimlane cards match the 1px chrome', () => {
    expect(getTaskCardBorderClasses(undefined, false, false)).toBe('border');
  });

  it('keeps local drafts dashed at the same weight', () => {
    expect(getTaskCardBorderClasses(undefined, false, true)).toBe(
      'border border-dashed border-blue-300 dark:border-blue-700'
    );
  });

  it('keeps the resize preview dashed at the same weight', () => {
    expect(getTaskCardBorderClasses('border-green-500', true, false)).toBe(
      'border border-dashed border-green-500'
    );
  });
});
