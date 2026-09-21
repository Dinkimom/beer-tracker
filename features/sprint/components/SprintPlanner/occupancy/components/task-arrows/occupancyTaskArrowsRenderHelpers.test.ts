import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { occupancyArrowEndpointsAreOnBoard } from './occupancyTaskArrowsRenderHelpers';

describe('occupancyArrowEndpointsAreOnBoard', () => {
  const positions = new Map<string, TaskPosition>([
    ['qa1', { assignee: 'u', duration: 1, startDay: 0, startPart: 0, taskId: 'qa1' }],
  ]);

  it('is false when the development endpoint is not placed', () => {
    expect(
      occupancyArrowEndpointsAreOnBoard(
        { arrowEndTaskId: 'qa1', arrowStartTaskId: 'dev1' },
        positions
      )
    ).toBe(false);
  });

  it('is true when both endpoints are placed', () => {
    const both = new Map(positions);
    both.set('dev1', { assignee: 'u', duration: 1, startDay: 0, startPart: 0, taskId: 'dev1' });
    expect(
      occupancyArrowEndpointsAreOnBoard(
        { arrowEndTaskId: 'qa1', arrowStartTaskId: 'dev1' },
        both
      )
    ).toBe(true);
  });
});
