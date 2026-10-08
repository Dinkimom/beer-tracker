import { describe, expect, it } from 'vitest';

import {
  isPlannerCommentLinkEndpoint,
  isTaskToTaskLink,
  plannerLinkInvolvesComment,
} from './plannerLinkPersistence';

describe('plannerLinkPersistence', () => {
  it('detects comment endpoints', () => {
    expect(isPlannerCommentLinkEndpoint('comment:11111111-1111-4111-8111-111111111111')).toBe(
      true
    );
    expect(isPlannerCommentLinkEndpoint('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isPlannerCommentLinkEndpoint('PROJ-1')).toBe(false);
  });

  it('allows local persist only when a comment endpoint is involved', () => {
    expect(
      plannerLinkInvolvesComment(
        'comment:11111111-1111-4111-8111-111111111111',
        'PROJ-1'
      )
    ).toBe(true);
    expect(plannerLinkInvolvesComment('PROJ-1', 'PROJ-2')).toBe(false);
    expect(isTaskToTaskLink('PROJ-1', 'PROJ-2')).toBe(true);
  });
});
