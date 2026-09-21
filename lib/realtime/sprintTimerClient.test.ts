import { afterEach, describe, expect, it } from 'vitest';

import { publishSprintTimerClient, resetSprintTimerClientForTests, subscribeSprintTimerClient } from './sprintTimerClient';
import { idleSprintTimerState } from './sprintTimerState';

describe('sprintTimerClient', () => {
  afterEach(() => {
    resetSprintTimerClientForTests();
  });

  it('notifies subscribers of a snapshot for a sprint', () => {
    const timer = idleSprintTimerState(1);
    const received: number[] = [];
    const unsubscribe = subscribeSprintTimerClient((payload) => {
      received.push(payload.sprintId);
    });
    publishSprintTimerClient(7, timer);
    expect(received).toEqual([7]);
    unsubscribe();
    publishSprintTimerClient(8, timer);
    expect(received).toEqual([7]);
  });
});
