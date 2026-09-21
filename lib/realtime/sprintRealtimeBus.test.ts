import type { SprintRealtimeMessage } from './sprintRealtimeTypes';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  publishSprintRealtimeEvent,
  resetSprintRealtimeBusForTests,
  subscribeLocalSprintRealtime,
} from './sprintRealtimeBus';

vi.mock('@/lib/env', () => ({
  getRedisUrl: () => undefined,
}));

const event: SprintRealtimeMessage = {
  at: 10,
  organizationId: 'org',
  originClientId: 'c1',
  resources: ['comments'],
  sprintId: 3,
  type: 'sprint.changed',
};

describe('sprintRealtimeBus', () => {
  afterEach(() => {
    resetSprintRealtimeBusForTests();
  });

  it('delivers in-process events when Redis is not configured', async () => {
    const received: SprintRealtimeMessage[] = [];
    const unsubscribe = subscribeLocalSprintRealtime((next) => {
      received.push(next);
    });

    await publishSprintRealtimeEvent(event);

    expect(received).toEqual([event]);
    unsubscribe();
  });

  it('keeps delivering after the test bus is reset and a new listener subscribes', async () => {
    resetSprintRealtimeBusForTests();
    const received: SprintRealtimeMessage[] = [];
    const unsubscribe = subscribeLocalSprintRealtime((next) => {
      received.push(next);
    });
    await publishSprintRealtimeEvent(event);
    expect(received).toEqual([event]);
    unsubscribe();
  });
});
