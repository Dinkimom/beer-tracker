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
});
