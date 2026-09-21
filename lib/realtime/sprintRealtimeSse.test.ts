import type { SprintRealtimeEvent } from './sprintRealtimeTypes';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { addSprintPresence, resetSprintPresenceForTests } from './sprintPresence';
import { publishSprintRealtimeEvent, resetSprintRealtimeBusForTests } from './sprintRealtimeBus';
import { createSprintRealtimeSseStream, parseSprintRealtimeSseQuery } from './sprintRealtimeSse';
import { mutateSprintTimerState, resetSprintTimerStoreForTests } from './sprintTimerStore';

vi.mock('@/lib/env', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getRedisUrl: () => undefined,
  };
});

const event: SprintRealtimeEvent = {
  at: 10,
  organizationId: 'org',
  originClientId: 'c1',
  resources: ['positions'],
  sprintId: 3,
  type: 'sprint.changed',
};

async function readSseUntilContains(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  snippet: string
): Promise<string> {
  let combined = '';
  await vi.waitFor(async () => {
    const result = await reader.read();
    combined += new TextDecoder().decode(result.value);
    expect(combined).toContain(snippet);
  });
  return combined;
}

describe('sprintRealtimeSse', () => {
  afterEach(() => {
    resetSprintRealtimeBusForTests();
    resetSprintPresenceForTests();
    resetSprintTimerStoreForTests();
  });

  it('parses sprint and organization query', () => {
    expect(
      parseSprintRealtimeSseQuery(new URL('http://localhost/api/realtime?sprintId=8&organizationId=org-a'))
    ).toEqual({ clientId: null, organizationId: 'org-a', sprintId: 8 });
    expect(
      parseSprintRealtimeSseQuery(
        new URL('http://localhost/api/realtime?sprintId=8&organizationId=org-a&clientId=tab-1')
      )
    ).toEqual({ clientId: 'tab-1', organizationId: 'org-a', sprintId: 8 });
    expect(parseSprintRealtimeSseQuery(new URL('http://localhost/api/realtime?sprintId=0&organizationId=org-a'))).toBeNull();
  });

  it('streams matching in-process events as SSE data lines', async () => {
    const stream = createSprintRealtimeSseStream({ organizationId: 'org', sprintId: 3 });
    const reader = stream.getReader();
    await publishSprintRealtimeEvent(event);
    const text = await readSseUntilContains(reader, '"type":"sprint.changed"');
    expect(text.startsWith('data: ') || text.includes('data: ')).toBe(true);
    expect(text).toContain('"sprintId":3');
    await reader.cancel();
  });

  it('does not stream sprint.changed echo back to the originating tab', async () => {
    const stream = createSprintRealtimeSseStream({
      clientId: 'c1',
      organizationId: 'org',
      sprintId: 3,
    });
    const reader = stream.getReader();
    await publishSprintRealtimeEvent(event);
    await publishSprintRealtimeEvent({ ...event, originClientId: 'c2', resources: ['links'] });
    const text = await readSseUntilContains(reader, '"originClientId":"c2"');
    expect(text).not.toContain('"originClientId":"c1"');
    await reader.cancel();
  });

  it('broadcasts a presence snapshot when a viewer joins the stream', async () => {
    const stream = createSprintRealtimeSseStream({
      organizationId: 'org',
      sprintId: 3,
      viewer: { avatarUrl: null, displayName: 'Ada', userId: 'user-a' },
    });
    const reader = stream.getReader();
    const text = await readSseUntilContains(reader, '"type":"sprint.presence"');
    expect(text).toContain('"displayName":"Ada"');
    await reader.cancel();
  });

  it('pushes the current timer snapshot when the stream opens', async () => {
    await mutateSprintTimerState({
      action: { action: 'start', durationMs: 5_000 },
      actor: { displayName: 'Ada', userId: 'user-a' },
      organizationId: 'org',
      originClientId: 'tab-a',
      sprintId: 3,
    });
    const stream = createSprintRealtimeSseStream({
      clientId: 'tab-b',
      organizationId: 'org',
      sprintId: 3,
    });
    const reader = stream.getReader();
    const text = await readSseUntilContains(reader, '"type":"sprint.timer"');
    expect(text).toContain('"status":"running"');
    await reader.cancel();
  });

  it('does not echo a timer mutation back to the originating tab', async () => {
    const stream = createSprintRealtimeSseStream({
      clientId: 'tab-a',
      organizationId: 'org',
      sprintId: 3,
    });
    const reader = stream.getReader();
    await mutateSprintTimerState({
      action: { action: 'start', durationMs: 5_000 },
      actor: { displayName: 'Ada', userId: 'user-a' },
      organizationId: 'org',
      originClientId: 'tab-a',
      sprintId: 3,
    });
    await mutateSprintTimerState({
      action: { action: 'pause' },
      actor: { displayName: 'Bob', userId: 'user-b' },
      organizationId: 'org',
      originClientId: 'tab-b',
      sprintId: 3,
    });
    const text = await readSseUntilContains(reader, '"status":"paused"');
    expect(text).not.toContain('"originClientId":"tab-a"');
    await reader.cancel();
  });

  it('keeps more than three viewers on the same sprint', async () => {
    const ids = ['a', 'b', 'c', 'd'];
    const streams = ids.map((id) =>
      createSprintRealtimeSseStream({
        clientId: `conn-${id}`,
        organizationId: 'org',
        sprintId: 3,
        viewer: { avatarUrl: null, displayName: id.toUpperCase(), userId: `user-${id}` },
      })
    );
    const readers = streams.map((stream) => stream.getReader());
    await vi.waitFor(async () => {
      const snapshot = await addSprintPresence('org', 3, 'probe', {
        avatarUrl: null,
        displayName: 'Probe',
        userId: 'user-probe',
      });
      expect(
        snapshot
          .map((viewer) => viewer.userId)
          .filter((userId) => userId.startsWith('user-') && userId !== 'user-probe')
          .sort()
      ).toEqual(['user-a', 'user-b', 'user-c', 'user-d']);
    });
    await Promise.all(readers.map((reader) => reader.cancel()));
  });

  it('removes presence when the request is aborted', async () => {
    const abort = new AbortController();
    const stream = createSprintRealtimeSseStream({
      clientId: 'conn-ada',
      organizationId: 'org',
      signal: abort.signal,
      sprintId: 3,
      viewer: { avatarUrl: null, displayName: 'Ada', userId: 'user-a' },
    });
    const reader = stream.getReader();
    await reader.read();
    abort.abort();
    await vi.waitFor(async () => {
      const snapshot = await addSprintPresence('org', 3, 'probe', {
        avatarUrl: null,
        displayName: 'Probe',
        userId: 'user-probe',
      });
      expect(snapshot.some((viewer) => viewer.userId === 'user-a')).toBe(false);
    });
    await reader.cancel();
  });
});
