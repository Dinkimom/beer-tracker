import { describe, expect, it } from 'vitest';

import { isEphemeralPlannerPositionId } from '@/lib/planner/ephemeralPlannerPositionId';

import { filterPersistablePositionUpdates } from './taskPositionsStoreSaveHelpers';

describe('filterPersistablePositionUpdates', () => {
  it('drops client-only planner cards before the API flush', () => {
    const updates = new Map([
      [
        'QUEUE-1',
        {
          isQa: false,
          position: { assignee: 'd1', duration: 1, startDay: 0, startPart: 0, taskId: 'QUEUE-1' },
        },
      ],
      [
        'local-image:abc',
        {
          isQa: false,
          position: {
            assignee: 'd1',
            duration: 2,
            startDay: 1,
            startPart: 0,
            taskId: 'local-image:abc',
          },
        },
      ],
    ]);

    const persistable = filterPersistablePositionUpdates(updates);
    expect([...persistable.keys()]).toEqual(['QUEUE-1']);
    expect(isEphemeralPlannerPositionId('local-image:abc')).toBe(true);
  });

  it('never flushes annotation or quick-add draft positions', () => {
    const position = (taskId: string) => ({
      isQa: false,
      position: { assignee: 'd1', duration: 1, startDay: 0, startPart: 0, taskId },
    });
    const updates = new Map([
      ['comment:c1', position('comment:c1')],
      ['local-task-1', position('local-task-1')],
      // Ключ карты — задача, а позиция внутри — аннотация: тоже не пишем.
      ['QUEUE-2', position('comment:c2')],
      ['QUEUE-3', position('QUEUE-3')],
    ]);
    expect([...filterPersistablePositionUpdates(updates).keys()]).toEqual(['QUEUE-3']);
  });
});
