import { describe, expect, it } from 'vitest';

import { applyTaskResizePreviewToPositionedTasks } from './useTaskResizeHelpers';

describe('applyTaskResizePreviewToPositionedTasks', () => {
  const neighbor = {
    position: {
      assignee: 'dev-1',
      duration: 2,
      startDay: 0,
      startPart: 1,
      taskId: 'n1',
    },
    task: { id: 'n1' },
  };
  const resizing = {
    position: {
      assignee: 'dev-1',
      duration: 2,
      startDay: 0,
      startPart: 0,
      taskId: 't1',
    },
    task: { id: 't1' },
  };

  it('returns the same list when there is no preview', () => {
    const items = [resizing, neighbor];
    expect(applyTaskResizePreviewToPositionedTasks(items, null, 20)).toBe(items);
  });

  it('applies duration and start to the previewed card only', () => {
    const next = applyTaskResizePreviewToPositionedTasks(
      [resizing, neighbor],
      { duration: 4, startCell: 3, taskId: 't1' },
      20
    );

    expect(next[0]?.position).toEqual(
      expect.objectContaining({
        duration: 4,
        plannedDuration: 4,
        startDay: 1,
        startPart: 0,
        taskId: 't1',
      })
    );
    expect(next[1]).toBe(neighbor);
  });
});
