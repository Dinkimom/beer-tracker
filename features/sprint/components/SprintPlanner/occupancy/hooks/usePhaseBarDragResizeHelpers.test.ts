import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { buildPhaseBarResizeSavedPosition } from './usePhaseBarDragResizeHelpers';

function position(overrides: Partial<TaskPosition> = {}): TaskPosition {
  return {
    assignee: 'dev-1',
    duration: 6,
    startDay: 2,
    startPart: 0,
    taskId: 'TASK-1',
    ...overrides,
  };
}

describe('buildPhaseBarResizeSavedPosition', () => {
  it('left-edge resize in part mode updates start and keeps the previous end', () => {
    const original = position({ startDay: 2, startPart: 0, duration: 6 });
    const saved = buildPhaseBarResizeSavedPosition({
      duration: 9,
      isDayMode: false,
      position: original,
      startCell: 3,
    });
    expect(saved).toMatchObject({
      startDay: 1,
      startPart: 0,
      duration: 9,
      plannedStartDay: 1,
      plannedStartPart: 0,
      plannedDuration: 9,
    });
  });
});
