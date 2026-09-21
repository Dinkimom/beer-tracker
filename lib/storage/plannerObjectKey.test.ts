import { describe, expect, it } from 'vitest';

import { buildPlannerObjectKey } from './plannerObjectKey';

describe('buildPlannerObjectKey', () => {
  it('builds an org-scoped planner key', () => {
    expect(buildPlannerObjectKey('org-1', 'file-1')).toBe('orgs/org-1/planner/file-1');
  });

  it('prepends a normalized prefix', () => {
    expect(buildPlannerObjectKey('org-1', 'file-1', 'local/')).toBe(
      'local/orgs/org-1/planner/file-1'
    );
  });
});
