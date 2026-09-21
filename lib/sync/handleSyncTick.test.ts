import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetSyncPlatformEnvCacheForTests } from '@/lib/env';
import * as orgSyncSettings from '@/lib/orgSyncSettings';

const listDue = vi.fn();
const updateOrganization = vi.fn();
const enqueueIncrementalSync = vi.fn();
const isSyncRedisConfigured = vi.fn();

vi.mock('@/lib/organizations', () => ({
  listOrganizationsDueForIncrementalSync: listDue,
  updateOrganization,
}));

vi.mock('@/lib/sync/queue', () => ({
  enqueueIncrementalSync,
}));

vi.mock('@/lib/sync/redisConnection', () => ({
  isSyncRedisConfigured,
}));

describe('handleSyncTick', () => {
  const prevSecret = process.env.SYNC_CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    resetSyncPlatformEnvCacheForTests();
    process.env.SYNC_CRON_SECRET = 'cron-test-secret-32chars-minimum!!';
    isSyncRedisConfigured.mockReturnValue(true);
    listDue.mockResolvedValue([]);
    enqueueIncrementalSync.mockResolvedValue({ id: 'job-1' } as never);
    updateOrganization.mockResolvedValue(null);
  });

  afterEach(() => {
    process.env.SYNC_CRON_SECRET = prevSecret;
    resetSyncPlatformEnvCacheForTests();
  });

  it('returns 401 when secret mismatches', async () => {
    const { handleSyncTick } = await import('./handleSyncTick');
    const r = await handleSyncTick({ cronSecret: 'wrong-secret-32-characters-long!!' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(401);
    }
    expect(listDue).not.toHaveBeenCalled();
  });

  it('returns redis_not_configured when REDIS_URL path is off', async () => {
    isSyncRedisConfigured.mockReturnValue(false);
    const { handleSyncTick } = await import('./handleSyncTick');
    const r = await handleSyncTick({
      cronSecret: 'cron-test-secret-32chars-minimum!!',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.body.enqueued).toBe(0);
      expect(r.body.reason).toBe('redis_not_configured');
    }
    expect(enqueueIncrementalSync).not.toHaveBeenCalled();
  });

  it('enqueues and bumps sync_next_run_at for valid org', async () => {
    listDue.mockResolvedValue([
      {
        created_at: new Date(),
        id: '00000000-0000-4000-8000-000000000001',
        initial_sync_completed_at: new Date(),
        name: 'O',
        settings: { sync: { enabled: true, intervalMinutes: 15, overlapMinutes: 10 } },
        slug: 'o',
        sync_next_run_at: new Date(0),
        tracker_org_id: '1',
        updated_at: new Date(),
      },
    ]);
    const { handleSyncTick } = await import('./handleSyncTick');
    const r = await handleSyncTick({
      cronSecret: 'cron-test-secret-32chars-minimum!!',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.body.enqueued).toBe(1);
      expect(r.body.organizationIds).toEqual(['00000000-0000-4000-8000-000000000001']);
    }
    expect(enqueueIncrementalSync).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000001'
    );
    expect(updateOrganization).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000001',
      expect.objectContaining({
        sync_next_run_at: expect.any(Date) as Date,
      })
    );
  });

  it('does not enqueue when sync is disabled for org', async () => {
    listDue.mockResolvedValue([
      {
        created_at: new Date(),
        id: '00000000-0000-4000-8000-000000000002',
        initial_sync_completed_at: new Date(),
        name: 'O2',
        settings: { sync: { enabled: false, intervalMinutes: 15, overlapMinutes: 10 } },
        slug: 'o2',
        sync_next_run_at: new Date(0),
        tracker_org_id: '1',
        updated_at: new Date(),
      },
    ]);
    const { handleSyncTick } = await import('./handleSyncTick');
    const r = await handleSyncTick({
      cronSecret: 'cron-test-secret-32chars-minimum!!',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.body.enqueued).toBe(0);
      expect(r.body.organizationIds).toEqual([]);
      expect(r.body.skippedInvalidSettings).toBeUndefined();
    }
    expect(enqueueIncrementalSync).not.toHaveBeenCalled();
    expect(updateOrganization).not.toHaveBeenCalled();
  });

  it('increments skippedInvalidSettings when validation fails', async () => {
    const spy = vi.spyOn(orgSyncSettings, 'parseResolveAndValidateOrgSyncFromSettingsRoot').mockReturnValue({
      code: 'OVERLAP_NOT_GREATER_THAN_CRON_TICK',
      message: 'overlap invalid',
      ok: false,
    });
    listDue.mockResolvedValue([
      {
        created_at: new Date(),
        id: '00000000-0000-4000-8000-000000000003',
        initial_sync_completed_at: new Date(),
        name: 'O3',
        settings: { sync: { enabled: true, intervalMinutes: 15, overlapMinutes: 10 } },
        slug: 'o3',
        sync_next_run_at: new Date(0),
        tracker_org_id: '1',
        updated_at: new Date(),
      },
    ]);
    try {
      const { handleSyncTick } = await import('./handleSyncTick');
      const r = await handleSyncTick({
        cronSecret: 'cron-test-secret-32chars-minimum!!',
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.body.enqueued).toBe(0);
        expect(r.body.skippedInvalidSettings).toBe(1);
      }
      expect(enqueueIncrementalSync).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('enqueues only valid org when mixed with disabled peer', async () => {
    listDue.mockResolvedValue([
      {
        created_at: new Date(),
        id: '00000000-0000-4000-8000-000000000004',
        initial_sync_completed_at: new Date(),
        name: 'Off',
        settings: { sync: { enabled: false, intervalMinutes: 15, overlapMinutes: 10 } },
        slug: 'off',
        sync_next_run_at: new Date(0),
        tracker_org_id: '1',
        updated_at: new Date(),
      },
      {
        created_at: new Date(),
        id: '00000000-0000-4000-8000-000000000005',
        initial_sync_completed_at: new Date(),
        name: 'On',
        settings: { sync: { enabled: true, intervalMinutes: 15, overlapMinutes: 10 } },
        slug: 'on',
        sync_next_run_at: new Date(0),
        tracker_org_id: '1',
        updated_at: new Date(),
      },
    ]);
    const { handleSyncTick } = await import('./handleSyncTick');
    const r = await handleSyncTick({
      cronSecret: 'cron-test-secret-32chars-minimum!!',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.body.enqueued).toBe(1);
      expect(r.body.organizationIds).toEqual(['00000000-0000-4000-8000-000000000005']);
    }
    expect(enqueueIncrementalSync).toHaveBeenCalledTimes(1);
    expect(enqueueIncrementalSync).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000005');
  });
});
