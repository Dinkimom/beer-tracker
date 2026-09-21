import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  computePlanRowHeightPx,
  computeRowMinHeight,
  computeUnplannedWarning,
} from './occupancyTableBodyRowMetrics';

function pos(overrides: Partial<TaskPosition> = {}): TaskPosition {
  return {
    assignee: '',
    duration: 1,
    startDay: 0,
    startPart: 0,
    taskId: 't',
    ...overrides,
  };
}

describe('computeRowMinHeight', () => {
  it('non-legacy without fact uses default row min', () => {
    expect(computeRowMinHeight(false, false)).toBe(56);
  });

  it('non-legacy with fact adds fact row and gap', () => {
    expect(computeRowMinHeight(false, true)).toBe(56 + 28 + 12);
  });

  it('non-legacy with taller fact row uses provided height', () => {
    expect(computeRowMinHeight(false, true, 91)).toBe(56 + 91 + 12);
  });

  it('legacy compact without fact', () => {
    expect(computeRowMinHeight(true, false)).toBe(40);
  });

  it('legacy compact with fact', () => {
    expect(computeRowMinHeight(true, true)).toBe(40 + 28 + 12);
  });
});

describe('computeUnplannedWarning', () => {
  const baseTask = {
    originalStatus: '',
    originalTaskId: undefined as string | undefined,
    status: 'in-progress' as const,
  };

  it('returns null when task is done by status', () => {
    expect(
      computeUnplannedWarning({
        hasQa: false,
        hasStoryPoints: true,
        hasTestPoints: false,
        position: undefined,
        qaPosition: undefined,
        task: { ...baseTask, status: 'done' },
      })
    ).toBeNull();
  });

  it('returns all when no dev plan and no qa plan', () => {
    expect(
      computeUnplannedWarning({
        hasQa: true,
        hasStoryPoints: true,
        hasTestPoints: true,
        position: undefined,
        qaPosition: undefined,
        task: baseTask,
      })
    ).toBe('all');
  });

  it('returns dev when dev is unplanned but QA phase exists', () => {
    expect(
      computeUnplannedWarning({
        hasQa: true,
        hasStoryPoints: true,
        hasTestPoints: true,
        position: undefined,
        qaPosition: pos(),
        task: baseTask,
      })
    ).toBe('dev');
  });

  it('returns qa when dev planned but QA phase missing', () => {
    expect(
      computeUnplannedWarning({
        hasQa: true,
        hasStoryPoints: true,
        hasTestPoints: true,
        position: pos(),
        qaPosition: undefined,
        task: baseTask,
      })
    ).toBe('qa');
  });
});

describe('computePlanRowHeightPx', () => {
  it('uses row min minus border when no overrides', () => {
    const h = computePlanRowHeightPx({
      legacyCompactLayout: false,
      rowMinHeight: 56,
      taskId: 't1',
      taskRowHeights: new Map(),
      unplannedWarning: null,
    });
    expect(h).toBe(55);
  });

  it('adds unplanned warning slack when not legacy', () => {
    const h = computePlanRowHeightPx({
      legacyCompactLayout: false,
      rowMinHeight: 56,
      taskId: 't1',
      taskRowHeights: new Map(),
      unplannedWarning: 'all',
    });
    expect(h).toBe(55 + 28);
  });
});
