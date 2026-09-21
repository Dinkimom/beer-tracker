import { describe, expect, it } from 'vitest';

import { sprintStatusPatchMatchesResult } from './sprintStatusRouteHelpers';

describe('sprintStatusPatchMatchesResult', () => {
  it('accepts an exact planner status', () => {
    expect(sprintStatusPatchMatchesResult('in_progress', 'in_progress')).toBe(true);
    expect(sprintStatusPatchMatchesResult('archived', 'archived')).toBe(true);
  });

  it('treats Jira closed as archived when the planner asked to release', () => {
    expect(sprintStatusPatchMatchesResult('released', 'archived')).toBe(true);
  });

  it('rejects a status the tracker did not persist', () => {
    expect(sprintStatusPatchMatchesResult('archived', 'in_progress')).toBe(false);
    expect(sprintStatusPatchMatchesResult('archived', undefined)).toBe(false);
  });
});
