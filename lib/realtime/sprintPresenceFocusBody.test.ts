import { describe, expect, it } from 'vitest';

import { SprintPresenceFocusBodySchema, sprintPresenceScopeOfBody } from './sprintPresenceFocusBody';

const body = { focus: null, organizationId: 'org' };

describe('sprintPresenceScopeOfBody', () => {
  it('reads a sprint or a quarter, exactly one of them', () => {
    expect(sprintPresenceScopeOfBody(SprintPresenceFocusBodySchema.parse({ ...body, sprintId: 7 }))).toBe(7);
    expect(sprintPresenceScopeOfBody(SprintPresenceFocusBodySchema.parse({ ...body, quarter: 4, year: 2026 }))).toEqual({
      quarter: 4,
      year: 2026,
    });
    expect(sprintPresenceScopeOfBody({})).toBeNull();
    expect(sprintPresenceScopeOfBody({ ...body, quarter: 4 })).toBeNull();
    expect(sprintPresenceScopeOfBody({ ...body, quarter: 4, sprintId: 7, year: 2026 })).toBeNull();
  });

  it('rejects a quarter outside 1–4', () => {
    expect(SprintPresenceFocusBodySchema.safeParse({ ...body, quarter: 5, year: 2026 }).success).toBe(false);
  });
});
