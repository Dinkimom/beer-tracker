import { describe, expect, it } from 'vitest';

import {
  isTrackerAdminCatalogRefreshParam,
  TRACKER_ADMIN_CATALOG_TTL_SEC,
  trackerAdminCatalogConnectionFingerprint,
} from './trackerAdminCatalogCache';

describe('trackerAdminCatalogConnectionFingerprint', () => {
  it('стабилен для одних и тех же входных данных', () => {
    const a = trackerAdminCatalogConnectionFingerprint('tok', 'https://api.tracker', 'org-1');
    const b = trackerAdminCatalogConnectionFingerprint('tok', 'https://api.tracker', 'org-1');
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
    expect(/^[0-9a-f]+$/u.test(a)).toBe(true);
  });

  it('меняется при смене токена, URL или Cloud Org ID', () => {
    const base = trackerAdminCatalogConnectionFingerprint('t', 'https://a', 'o');
    expect(trackerAdminCatalogConnectionFingerprint('t2', 'https://a', 'o')).not.toBe(base);
    expect(trackerAdminCatalogConnectionFingerprint('t', 'https://b', 'o')).not.toBe(base);
    expect(trackerAdminCatalogConnectionFingerprint('t', 'https://a', 'p')).not.toBe(base);
  });
});

describe('tracker admin catalog cache policy', () => {
  it('uses a 30-minute TTL for projects and fields', () => {
    expect(TRACKER_ADMIN_CATALOG_TTL_SEC).toBe(30 * 60);
  });

  it('accepts refresh=1 or refresh=true', () => {
    expect(isTrackerAdminCatalogRefreshParam('1')).toBe(true);
    expect(isTrackerAdminCatalogRefreshParam('true')).toBe(true);
    expect(isTrackerAdminCatalogRefreshParam('0')).toBe(false);
    expect(isTrackerAdminCatalogRefreshParam(null)).toBe(false);
  });
});
