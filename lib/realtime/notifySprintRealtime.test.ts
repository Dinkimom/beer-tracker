import type { SprintRealtimeMessage } from './sprintRealtimeTypes';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';

import { notifySprintRealtimeForSprintIds } from './notifySprintRealtime';
import { resetSprintRealtimeBusForTests, subscribeLocalSprintRealtime } from './sprintRealtimeBus';
import { REALTIME_CLIENT_ID_HEADER } from './sprintRealtimeConstants';

vi.mock('@/lib/env', () => ({
  getRedisUrl: () => undefined,
}));

describe('notifySprintRealtimeForSprintIds', () => {
  afterEach(() => {
    resetSprintRealtimeBusForTests();
  });

  it('publishes the resource to each sprint of the organization', async () => {
    const received: SprintRealtimeMessage[] = [];
    const unsubscribe = subscribeLocalSprintRealtime((next) => {
      received.push(next);
    });
    const request = new Request('http://localhost/api/issues/BT-1/status', {
      headers: {
        [TENANT_ORG_HEADER]: 'org-1',
        [REALTIME_CLIENT_ID_HEADER]: 'tab-a',
      },
    });

    notifySprintRealtimeForSprintIds(request, [7, 8], ['tasks'], {
      issueStatus: { issueKey: 'BT-1', statusKey: 'inProgress' },
    });
    await vi.waitFor(() => {
      expect(received).toHaveLength(2);
    });

    expect(received.map((event) => ('resources' in event ? event.resources : []))).toEqual([
      ['tasks'],
      ['tasks'],
    ]);
    expect(
      received.every(
        (event) => event.type === 'sprint.changed' && event.issueStatus?.statusKey === 'inProgress'
      )
    ).toBe(true);
    expect(received.map((event) => event.sprintId)).toEqual([7, 8]);
    unsubscribe();
  });

  it('skips publish when the organization header is missing', async () => {
    const received: SprintRealtimeMessage[] = [];
    const unsubscribe = subscribeLocalSprintRealtime((next) => {
      received.push(next);
    });

    notifySprintRealtimeForSprintIds(new Request('http://localhost/api/issues/BT-1/status'), [7], ['tasks']);
    await Promise.resolve();

    expect(received).toEqual([]);
    unsubscribe();
  });
});
