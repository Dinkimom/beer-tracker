import { describe, expect, it } from 'vitest';

import { trackerAdminCatalogConnectionFingerprint } from './trackerAdminCatalogCache';

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
