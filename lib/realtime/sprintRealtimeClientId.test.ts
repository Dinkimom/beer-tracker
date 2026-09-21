/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getBrowserRealtimeClientId,
  resetBrowserRealtimeClientIdForTests,
} from './sprintRealtimeClientId';
import { REALTIME_CLIENT_ID_STORAGE_KEY } from './sprintRealtimeConstants';

describe('getBrowserRealtimeClientId', () => {
  afterEach(() => {
    resetBrowserRealtimeClientIdForTests();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('reuses the same id when sessionStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const first = getBrowserRealtimeClientId();
    const second = getBrowserRealtimeClientId();

    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(0);
  });

  it('reads a stable id from sessionStorage', () => {
    sessionStorage.setItem(REALTIME_CLIENT_ID_STORAGE_KEY, 'tab-stable');

    expect(getBrowserRealtimeClientId()).toBe('tab-stable');
  });
});
