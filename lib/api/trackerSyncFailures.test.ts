/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { reportTrackerSyncFailures, TRACKER_SYNC_FAILED_EVENT } from './trackerSyncFailures';

describe('reportTrackerSyncFailures', () => {
  const listener = vi.fn();
  window.addEventListener(TRACKER_SYNC_FAILED_EVENT, listener);

  afterEach(() => {
    listener.mockClear();
  });

  it('dispatches the valid failures from a position response', () => {
    reportTrackerSyncFailures({
      position: {},
      trackerSyncFailures: [{ field: 'assignee', issueKey: 'BT-1' }, { field: 'oops', issueKey: 'BT-2' }],
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual([
      { field: 'assignee', issueKey: 'BT-1' },
    ]);
  });

  it('stays silent when the tracker sync succeeded', () => {
    reportTrackerSyncFailures({ success: true });
    reportTrackerSyncFailures(null);
    expect(listener).not.toHaveBeenCalled();
  });
});
