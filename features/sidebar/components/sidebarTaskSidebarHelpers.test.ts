import type { SprintInfo } from '@/types/tracker';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveSidebarCanEdit } from './sidebarTaskSidebarHelpers';

function sprint(status: string, startDate = '2026-10-05'): SprintInfo {
  return {
    endDate: '2026-10-16',
    endDateTime: '2026-10-16T18:00:00',
    id: 1,
    name: 'Sprint',
    startDate,
    startDateTime: `${startDate}T09:00:00`,
    status,
  };
}

describe('resolveSidebarCanEdit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false without sprint', () => {
    expect(resolveSidebarCanEdit(null, true)).toBe(false);
  });

  it('allows editing draft sprint for everyone', () => {
    expect(resolveSidebarCanEdit(sprint('draft'))).toBe(true);
    expect(resolveSidebarCanEdit(sprint('Draft'), true)).toBe(true);
  });

  it('allows organization admin to edit in-progress sprint any day', () => {
    expect(resolveSidebarCanEdit(sprint('in_progress'), true)).toBe(true);
    expect(resolveSidebarCanEdit(sprint('In Progress'), true)).toBe(true);
  });

  it('forbids non-admin to edit in-progress sprint after the first Monday', () => {
    expect(resolveSidebarCanEdit(sprint('in_progress'))).toBe(false);
  });

  it('allows non-admin to edit in-progress sprint on its first Monday', () => {
    vi.setSystemTime(new Date(2026, 9, 5, 12));
    expect(resolveSidebarCanEdit(sprint('in_progress'))).toBe(true);
  });

  it('forbids organization admin to edit closed sprint', () => {
    expect(resolveSidebarCanEdit(sprint('closed'), true)).toBe(false);
  });
});
