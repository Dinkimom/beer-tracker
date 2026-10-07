import { describe, expect, it } from 'vitest';

import {
  DEMO_SYSTEM_ORGANIZATION_ID,
  DEMO_SYSTEM_ORGANIZATION_SLUG,
  sqlExcludingDemoSystemOrganization,
} from './demoSystemOrganizationConstants';

describe('sqlExcludingDemoSystemOrganization', () => {
  it('excludes the seeded demo organization by id and slug', () => {
    const sql = sqlExcludingDemoSystemOrganization();
    expect(sql).toContain(DEMO_SYSTEM_ORGANIZATION_ID);
    expect(sql).toContain(DEMO_SYSTEM_ORGANIZATION_SLUG);
    expect(sql).toContain('id <>');
    expect(sql).toContain('slug IS DISTINCT FROM');
  });

  it('qualifies columns when the query uses an alias', () => {
    expect(sqlExcludingDemoSystemOrganization('o.id', 'o.slug')).toBe(
      `o.id <> '${DEMO_SYSTEM_ORGANIZATION_ID}'::uuid AND o.slug IS DISTINCT FROM '${DEMO_SYSTEM_ORGANIZATION_SLUG}'`
    );
  });
});
