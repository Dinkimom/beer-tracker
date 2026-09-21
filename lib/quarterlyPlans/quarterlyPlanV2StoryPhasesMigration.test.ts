import { describe, expect, it } from 'vitest';

import { isLegacyStoryPhasesPrimaryKey } from './quarterlyPlanV2StoryPhasesMigration';

describe('isLegacyStoryPhasesPrimaryKey', () => {
  it('detects plan_id + story_key PK', () => {
    expect(isLegacyStoryPhasesPrimaryKey(['plan_id', 'story_key'])).toBe(true);
    expect(isLegacyStoryPhasesPrimaryKey(['story_key', 'plan_id'])).toBe(true);
  });

  it('rejects id-based PK', () => {
    expect(isLegacyStoryPhasesPrimaryKey(['id'])).toBe(false);
  });

  it('rejects composite with id', () => {
    expect(isLegacyStoryPhasesPrimaryKey(['plan_id', 'story_key', 'id'])).toBe(false);
  });
});
