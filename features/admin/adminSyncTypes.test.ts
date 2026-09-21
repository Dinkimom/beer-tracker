import { describe, expect, it } from 'vitest';

import { isAdminSyncStatusPayload } from '@/features/admin/adminSyncTypes';

describe('isAdminSyncStatusPayload', () => {
  it('returns true for minimal valid shape', () => {
    expect(
      isAdminSyncStatusPayload({
        cooldown: { fullRescanCooldownMinutes: 0 },
        lastSyncRun: null,
        organization: { id: 'o1', initialSyncCompletedAt: null, name: 'Acme', syncNextRunAt: null },
        platformSyncBounds: {
          cronTickMinutes: 1,
          defaultIntervalMinutes: 5,
          defaultMaxIssuesPerRun: 100,
          defaultOverlapMinutes: 2,
          maxIntervalMinutes: 60,
          maxMaxIssuesPerRun: 1000,
          maxOverlapMinutes: 10,
          minIntervalMinutes: 1,
          minMaxIssuesPerRun: 1,
          minOverlapMinutes: 0,
        },
        redisConfigured: true,
        redisJobs: [],
        resolvedSync: {
          enabled: true,
          intervalMinutes: 5,
          maxIssuesPerRun: 100,
          overlapMinutes: 2,
        },
        runningSyncRun: null,
        syncCronSecretConfigured: true,
        syncSettingsRaw: {},
        syncValidation: { ok: true },
      })
    ).toBe(true);
  });

  it('returns true when syncCronSecretConfigured is false', () => {
    expect(
      isAdminSyncStatusPayload({
        cooldown: { fullRescanCooldownMinutes: 0 },
        lastSyncRun: null,
        organization: { id: 'o1', initialSyncCompletedAt: null, name: 'Acme', syncNextRunAt: null },
        platformSyncBounds: {
          cronTickMinutes: 1,
          defaultIntervalMinutes: 5,
          defaultMaxIssuesPerRun: 100,
          defaultOverlapMinutes: 2,
          maxIntervalMinutes: 60,
          maxMaxIssuesPerRun: 1000,
          maxOverlapMinutes: 10,
          minIntervalMinutes: 1,
          minMaxIssuesPerRun: 1,
          minOverlapMinutes: 0,
        },
        redisConfigured: true,
        redisJobs: [],
        resolvedSync: {
          enabled: true,
          intervalMinutes: 5,
          maxIssuesPerRun: 100,
          overlapMinutes: 2,
        },
        runningSyncRun: null,
        syncCronSecretConfigured: false,
        syncSettingsRaw: {},
        syncValidation: { ok: true },
      })
    ).toBe(true);
  });

  it('returns false for invalid payloads', () => {
    expect(isAdminSyncStatusPayload(null)).toBe(false);
    expect(isAdminSyncStatusPayload({})).toBe(false);
    expect(isAdminSyncStatusPayload({ organization: {} })).toBe(false);
    expect(
      isAdminSyncStatusPayload({
        cooldown: { fullRescanCooldownMinutes: 0 },
        lastSyncRun: null,
        organization: { id: 'o1', initialSyncCompletedAt: null, name: 'Acme', syncNextRunAt: null },
        platformSyncBounds: {
          cronTickMinutes: 1,
          defaultIntervalMinutes: 5,
          defaultMaxIssuesPerRun: 100,
          defaultOverlapMinutes: 2,
          maxIntervalMinutes: 60,
          maxMaxIssuesPerRun: 1000,
          maxOverlapMinutes: 10,
          minIntervalMinutes: 1,
          minMaxIssuesPerRun: 1,
          minOverlapMinutes: 0,
        },
        redisConfigured: true,
        redisJobs: [],
        resolvedSync: {
          enabled: true,
          intervalMinutes: 5,
          maxIssuesPerRun: 100,
          overlapMinutes: 2,
        },
        runningSyncRun: null,
        syncSettingsRaw: {},
        syncValidation: { ok: true },
      })
    ).toBe(false);
  });
});
