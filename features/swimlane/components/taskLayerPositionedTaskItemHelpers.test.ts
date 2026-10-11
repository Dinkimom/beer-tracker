import type { Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { resolveOverdueBaselineLinkClearanceOffsetPx } from '@/features/swimlane/utils/taskLayerTaskLayout';

import { resolveTaskLayerBaselineCenterOffsetPx } from './taskLayerPositionedTaskItemHelpers';

function pos(): TaskPosition {
  return { assignee: 'u', duration: 2, startDay: 0, startPart: 0, taskId: '' };
}

describe('resolveTaskLayerBaselineCenterOffsetPx', () => {
  const positions = new Map<string, TaskPosition>([
    ['a', pos()],
    ['b', pos()],
  ]);
  const links = [{ fromTaskId: 'a', toTaskId: 'b' }];

  it('keeps the baseline centered when the card has no arrow', () => {
    expect(
      resolveTaskLayerBaselineCenterOffsetPx({
        baselineHeight: 42,
        stripCount: 1,
        taskId: 'a',
        taskLinks: [],
        taskPositions: positions,
      })
    ).toBe(0);
  });

  it('drops the baseline when a user link is drawn', () => {
    expect(
      resolveTaskLayerBaselineCenterOffsetPx({
        baselineHeight: 42,
        stripCount: 1,
        taskId: 'a',
        taskLinks: links,
        taskPositions: positions,
      })
    ).toBe(resolveOverdueBaselineLinkClearanceOffsetPx(42));
  });

  it('stays centered when user links are hidden', () => {
    expect(
      resolveTaskLayerBaselineCenterOffsetPx({
        baselineHeight: 42,
        stripCount: 1,
        taskId: 'a',
        taskLinks: links,
        taskPositions: positions,
        userLinksVisible: false,
      })
    ).toBe(0);
  });

  it('still drops for a dev-qa arrow when user links are hidden', () => {
    const qaTasksMap = new Map<string, Task>([['a', { id: 'b' } as Task]]);
    expect(
      resolveTaskLayerBaselineCenterOffsetPx({
        baselineHeight: 42,
        qaTasksMap,
        stripCount: 1,
        taskId: 'a',
        taskLinks: [],
        taskPositions: positions,
        userLinksVisible: false,
      })
    ).toBe(resolveOverdueBaselineLinkClearanceOffsetPx(42));
  });
});
