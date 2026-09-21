import type { SyncPlatformEnv } from './env';

import { describe, expect, it } from 'vitest';

import {
  extractOrgSyncSettingsJson,
  getLastFullRescanAtFromSettingsRoot,
  mergeOrganizationSettingsSyncPatch,
  parseOrgSyncSettingsPartial,
  parseResolveAndValidateOrgSyncFromSettingsRoot,
  resolveOrgSyncSettings,
  validateResolvedOrgSyncSettings,
} from './orgSyncSettings';

const platformOk: SyncPlatformEnv = {
  cronTickMinutes: 5,
  minIntervalMinutes: 5,
  maxIntervalMinutes: 120,
  defaultIntervalMinutes: 15,
  minOverlapMinutes: 6,
  maxOverlapMinutes: 60,
  defaultOverlapMinutes: 12,
  maxOrgsPerTick: 10,
  defaultMaxIssuesPerRun: 100,
  fullRescanCooldownMinutes: 0,
  fullSyncMaxIssuesPerRun: 50_000,
  minMaxIssuesPerRun: 10,
  maxMaxIssuesPerRun: 1000,
};

describe('orgSyncSettings', () => {
  it('parseOrgSyncSettingsPartial accepts empty object', () => {
    expect(parseOrgSyncSettingsPartial({})).toEqual({});
  });

  it('parseOrgSyncSettingsPartial rejects unknown keys', () => {
    expect(() => parseOrgSyncSettingsPartial({ extra: 1 })).toThrow();
  });

  it('extractOrgSyncSettingsJson reads nested sync', () => {
    expect(
      extractOrgSyncSettingsJson({ sync: { enabled: false }, other: 1 })
    ).toEqual({ enabled: false });
  });

  it('resolveOrgSyncSettings applies defaults and clamps interval', () => {
    const r = resolveOrgSyncSettings({ intervalMinutes: 200 }, platformOk);
    expect(r.intervalMinutes).toBe(120);
    expect(r.overlapMinutes).toBe(12);
  });

  it('validateResolvedOrgSyncSettings fails when overlap <= cron tick', () => {
    const badPlatform: SyncPlatformEnv = {
      ...platformOk,
      cronTickMinutes: 15,
      defaultOverlapMinutes: 20,
      minOverlapMinutes: 6,
    };
    const resolved = resolveOrgSyncSettings(
      { overlapMinutes: 10 },
      badPlatform
    );
    expect(resolved.overlapMinutes).toBe(10);
    const v = validateResolvedOrgSyncSettings(resolved, badPlatform);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.code).toBe('OVERLAP_NOT_GREATER_THAN_CRON_TICK');
    }
  });

  it('getLastFullRescanAtFromSettingsRoot reads sync.lastFullRescanAt', () => {
    const d = new Date('2026-01-02T03:04:05.000Z').toISOString();
    expect(
      getLastFullRescanAtFromSettingsRoot({ sync: { lastFullRescanAt: d } })?.toISOString()
    ).toBe(d);
    expect(getLastFullRescanAtFromSettingsRoot({ sync: {} })).toBeNull();
    expect(getLastFullRescanAtFromSettingsRoot({})).toBeNull();
  });

  it('parseResolveAndValidateOrgSyncFromSettingsRoot succeeds for valid settings', () => {
    const root = {
      sync: { intervalMinutes: 10, overlapMinutes: 20 },
    };
    const v = parseResolveAndValidateOrgSyncFromSettingsRoot(root, platformOk);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.settings.intervalMinutes).toBe(10);
      expect(v.settings.overlapMinutes).toBe(20);
    }
  });

  it('mergeOrganizationSettingsSyncPatch preserves other settings keys', () => {
    const merged = mergeOrganizationSettingsSyncPatch(
      { other: true, sync: { intervalMinutes: 10, overlapMinutes: 20 } },
      { enabled: false }
    );
    expect(merged.other).toBe(true);
    expect(merged.sync).toEqual({
      enabled: false,
      intervalMinutes: 10,
      overlapMinutes: 20,
    });
  });
});
