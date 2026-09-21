import { describe, expect, it } from 'vitest';

import { isEphemeralPlannerPositionId } from './ephemeralPlannerPositionId';

describe('isEphemeralPlannerPositionId', () => {
  it('treats quick-add drafts, local photos, and notes as client-only', () => {
    expect(isEphemeralPlannerPositionId('local-task-abc')).toBe(true);
    expect(isEphemeralPlannerPositionId('local-image:abc')).toBe(true);
    expect(isEphemeralPlannerPositionId('comment:abc')).toBe(true);
  });

  it('keeps tracker issues persistable', () => {
    expect(isEphemeralPlannerPositionId('QUEUE-12')).toBe(false);
  });
});
