import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { dedupePlannedPositions, plannedPositionDedupeKey } from './usePlannedInSprintPositions';

function pos(overrides: Partial<TaskPosition> & { sourceTaskId: string }): TaskPosition {
  return {
    taskId: 'STORY-1',
    assignee: '',
    startDay: 0,
    startPart: 0,
    duration: 8,
    ...overrides,
  };
}

describe('dedupePlannedPositions', () => {
  it('removes duplicate source tasks at same slot', () => {
    const a = pos({ sourceTaskId: 'TASK-1', startDay: 5 });
    const b = pos({ sourceTaskId: 'TASK-1', startDay: 5 });
    const c = pos({ sourceTaskId: 'TASK-2', startDay: 5 });
    expect(dedupePlannedPositions([a, b, c])).toHaveLength(2);
  });

  it('keeps same task at different start days', () => {
    const a = pos({ sourceTaskId: 'TASK-1', startDay: 0 });
    const b = pos({ sourceTaskId: 'TASK-1', startDay: 10 });
    expect(dedupePlannedPositions([a, b])).toHaveLength(2);
    expect(plannedPositionDedupeKey(a)).not.toBe(plannedPositionDedupeKey(b));
  });
});
