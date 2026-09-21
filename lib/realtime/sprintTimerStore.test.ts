import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetSprintRealtimeBusForTests, subscribeLocalSprintRealtime } from './sprintRealtimeBus';
import { mutateSprintTimerState, readSprintTimerState, resetSprintTimerStoreForTests } from './sprintTimerStore';

vi.mock('@/lib/env', () => ({
  getRedisUrl: () => undefined,
}));

const actor = { displayName: 'Ada', userId: 'user-a' };

describe('sprintTimerStore', () => {
  afterEach(() => {
    resetSprintTimerStoreForTests();
    resetSprintRealtimeBusForTests();
  });

  it('returns idle when nothing was started', async () => {
    const timer = await readSprintTimerState('org', 3);
    expect(timer.status).toBe('idle');
  });

  it('persists a mutation in memory and publishes a sprint.timer snapshot', async () => {
    const received: string[] = [];
    const unsubscribe = subscribeLocalSprintRealtime((event) => {
      received.push(event.type);
    });
    const started = await mutateSprintTimerState({
      action: { action: 'start', durationMs: 5_000 },
      actor,
      organizationId: 'org',
      originClientId: 'tab-a',
      sprintId: 3,
    });
    expect(started.status).toBe('running');
    expect((await readSprintTimerState('org', 3)).status).toBe('running');
    await vi.waitFor(() => {
      expect(received).toContain('sprint.timer');
    });
    unsubscribe();
  });

  it('keeps timers isolated per sprint', async () => {
    await mutateSprintTimerState({
      action: { action: 'start', durationMs: 5_000 },
      actor,
      organizationId: 'org',
      originClientId: null,
      sprintId: 3,
    });
    expect((await readSprintTimerState('org', 4)).status).toBe('idle');
  });
});
