import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetSyncPlatformEnvCacheForTests } from '@/lib/env';

const findOrganizationById = vi.fn();
const runOrgSync = vi.fn();
const findRunningSyncRunForOrganization = vi.fn();
const findLastFullRescanFinishedAt = vi.fn();
const finishSyncRun = vi.fn();

vi.mock('@/lib/organizations', () => ({
  findOrganizationById,
}));

vi.mock('@/lib/sync/runOrgSync', () => ({
  runOrgSync,
}));

vi.mock('@/lib/sync/syncRunsRepository', () => ({
  findLastFullRescanFinishedAt,
  findRunningSyncRunForOrganization,
  finishSyncRun,
}));

describe('handleSyncFullRescan', () => {
  const prevSecret = process.env.SYNC_CRON_SECRET;
  const orgId = '00000000-0000-4000-8000-000000000001';
  const secret = 'cron-test-secret-32chars-minimum!!';

  beforeEach(() => {
    vi.clearAllMocks();
    resetSyncPlatformEnvCacheForTests();
    process.env.SYNC_CRON_SECRET = secret;
    findOrganizationById.mockResolvedValue({
      id: orgId,
      name: 'O',
      slug: 'o',
    });
    findRunningSyncRunForOrganization.mockResolvedValue(null);
    findLastFullRescanFinishedAt.mockResolvedValue(null);
    finishSyncRun.mockResolvedValue(undefined);
    runOrgSync.mockResolvedValue({
      finalStatus: 'success',
      status: 'ok',
      syncRunId: 'run-ok-1',
    });
  });

  afterEach(() => {
    process.env.SYNC_CRON_SECRET = prevSecret;
    resetSyncPlatformEnvCacheForTests();
  });

  it('returns 401 when secret mismatches', async () => {
    const { handleSyncFullRescan } = await import('./handleSyncFullRescan');
    const r = await handleSyncFullRescan({
      cronSecret: 'wrong-secret-32-characters-long!!',
      organizationId: orgId,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(401);
    }
    expect(runOrgSync).not.toHaveBeenCalled();
  });

  it('returns 404 when organization is missing', async () => {
    findOrganizationById.mockResolvedValue(null);
    const { handleSyncFullRescan } = await import('./handleSyncFullRescan');
    const r = await handleSyncFullRescan({ cronSecret: secret, organizationId: orgId });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(404);
    }
    expect(runOrgSync).not.toHaveBeenCalled();
  });

  it('returns 409 when a fresh sync run is already running', async () => {
    findRunningSyncRunForOrganization.mockResolvedValue({
      id: 'run-1',
      started_at: new Date(),
    });
    const { handleSyncFullRescan } = await import('./handleSyncFullRescan');
    const r = await handleSyncFullRescan({ cronSecret: secret, organizationId: orgId });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(409);
      expect(r.syncRunId).toBe('run-1');
    }
    expect(finishSyncRun).not.toHaveBeenCalled();
    expect(runOrgSync).not.toHaveBeenCalled();
  });

  it('fails stale running sync and continues inline rescan', async () => {
    findRunningSyncRunForOrganization.mockResolvedValue({
      id: 'run-stale',
      started_at: new Date(Date.now() - 41 * 60_000),
    });
    const { handleSyncFullRescan } = await import('./handleSyncFullRescan');
    const r = await handleSyncFullRescan({ cronSecret: secret, organizationId: orgId });
    expect(r.ok).toBe(true);
    expect(finishSyncRun).toHaveBeenCalledWith({
      errorSummary: 'Прервано: превышено время inline-прогона',
      status: 'failed',
      syncRunId: 'run-stale',
    });
    expect(runOrgSync).toHaveBeenCalledWith({
      mode: 'full_rescan',
      organizationId: orgId,
    });
  });

  it('returns 429 during cooldown', async () => {
    process.env.SYNC_FULL_RESCAN_COOLDOWN_MINUTES = '60';
    resetSyncPlatformEnvCacheForTests();
    findLastFullRescanFinishedAt.mockResolvedValue(new Date());
    const { handleSyncFullRescan } = await import('./handleSyncFullRescan');
    const r = await handleSyncFullRescan({ cronSecret: secret, organizationId: orgId });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(429);
      expect(r.retryAfterSeconds).toBeGreaterThan(0);
    }
    expect(runOrgSync).not.toHaveBeenCalled();
    delete process.env.SYNC_FULL_RESCAN_COOLDOWN_MINUTES;
  });

  it('returns 422 when runOrgSync skips', async () => {
    runOrgSync.mockResolvedValue({
      reason: 'missing_tracker_token',
      status: 'skipped',
    });
    const { handleSyncFullRescan } = await import('./handleSyncFullRescan');
    const r = await handleSyncFullRescan({ cronSecret: secret, organizationId: orgId });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(422);
      expect(r.error).toContain('missing_tracker_token');
    }
  });

  it('runs full rescan inline without Redis', async () => {
    const { handleSyncFullRescan } = await import('./handleSyncFullRescan');
    const r = await handleSyncFullRescan({ cronSecret: secret, organizationId: orgId });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.body).toEqual({
        finalStatus: 'success',
        organizationId: orgId,
        syncRunId: 'run-ok-1',
      });
    }
    expect(runOrgSync).toHaveBeenCalledWith({
      mode: 'full_rescan',
      organizationId: orgId,
    });
  });
});
