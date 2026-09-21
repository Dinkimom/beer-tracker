import { beforeEach, describe, expect, it, vi } from 'vitest';

import { query } from '@/lib/db';

import {
  ensureUserNotificationsTable,
  resetUserNotificationsTableEnsuredForTests,
} from './ensureUserNotificationsTable';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  getBeerTrackerSchema: () => 'beer_tracker',
}));

describe('ensureUserNotificationsTable', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
    resetUserNotificationsTableEnsuredForTests();
  });

  it('creates table and indexes once', async () => {
    await ensureUserNotificationsTable();
    await ensureUserNotificationsTable();

    expect(vi.mocked(query)).toHaveBeenCalledTimes(4);
    expect(String(vi.mocked(query).mock.calls[0]?.[0])).toContain(
      'CREATE TABLE IF NOT EXISTS beer_tracker.user_notifications'
    );
    expect(String(vi.mocked(query).mock.calls[1]?.[0])).toContain(
      'user_notifications_kind_check'
    );
    expect(String(vi.mocked(query).mock.calls[2]?.[0])).toContain(
      'idx_user_notifications_recipient_created'
    );
  });
});
