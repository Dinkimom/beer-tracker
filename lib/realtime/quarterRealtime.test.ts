import { afterEach, describe, expect, it, vi } from 'vitest';

import { createQuarterRealtimeSseStream, notifyQuarterRealtime } from './quarterRealtime';
import { addSprintPresence, resetSprintPresenceForTests } from './sprintPresence';
import { resetSprintRealtimeBusForTests } from './sprintRealtimeBus';
import { REALTIME_CLIENT_ID_HEADER } from './sprintRealtimeConstants';

vi.mock('@/lib/env', async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  getRedisUrl: () => undefined,
}));

const SCOPE = { organizationId: 'org', quarter: 4, year: 2026 };
const savedFrom = (clientId: string) =>
  new Request('http://localhost/api/quarterly-plans', { headers: { [REALTIME_CLIENT_ID_HEADER]: clientId } });

describe('quarterRealtime', () => {
  afterEach(() => {
    resetSprintRealtimeBusForTests();
    resetSprintPresenceForTests();
  });

  it('delivers a plan change of the quarter to other tabs only', async () => {
    const reader = createQuarterRealtimeSseStream({ ...SCOPE, clientId: 'tab-a' }).getReader();

    notifyQuarterRealtime(savedFrom('tab-a'), SCOPE);
    notifyQuarterRealtime(savedFrom('tab-b'), { ...SCOPE, quarter: 3 });
    notifyQuarterRealtime(savedFrom('tab-b'), { ...SCOPE, organizationId: 'other' });
    notifyQuarterRealtime(savedFrom('tab-b'), SCOPE);

    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    expect(text.match(/data: /g)).toHaveLength(1);
    expect(JSON.parse(text.slice('data: '.length))).toMatchObject({ ...SCOPE, originClientId: 'tab-b', type: 'quarter.changed' });
    await reader.cancel();
  });

  it('puts the tab into the presence of the quarter and takes it out when the stream closes', async () => {
    const viewer = { avatarUrl: null, displayName: 'Ada', userId: 'user-a' };
    const reader = createQuarterRealtimeSseStream({ ...SCOPE, clientId: 'tab-a', presence: { viewer } }).getReader();

    const joined = JSON.parse(new TextDecoder().decode((await reader.read()).value).slice('data: '.length));
    expect(joined).toMatchObject({ ...SCOPE, type: 'quarter.presence', viewers: [{ clientId: 'tab-a', userId: 'user-a' }] });

    await reader.cancel();
    await vi.waitFor(async () => {
      expect(await addSprintPresence('org', SCOPE, 'probe', viewer)).toHaveLength(1);
    });
  });

  it('stops listening when the request is aborted', async () => {
    const abort = new AbortController();
    const reader = createQuarterRealtimeSseStream({ ...SCOPE, clientId: null, signal: abort.signal }).getReader();
    abort.abort();
    notifyQuarterRealtime(savedFrom('tab-b'), SCOPE);
    expect((await reader.read()).done).toBe(true);
  });
});
