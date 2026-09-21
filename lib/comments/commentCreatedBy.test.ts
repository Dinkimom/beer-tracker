import { describe, expect, it } from 'vitest';

import { resolveCommentCreatedBy } from './commentCreatedBy';

describe('resolveCommentCreatedBy', () => {
  it('keeps a registry UUID', () => {
    expect(resolveCommentCreatedBy('7c9e6679-7425-40de-944b-e07fc1f90ae7')).toBe(
      '7c9e6679-7425-40de-944b-e07fc1f90ae7'
    );
  });

  it('drops onprem-anonymous and other non-UUID sentinels', () => {
    expect(resolveCommentCreatedBy('onprem-anonymous')).toBeNull();
    expect(resolveCommentCreatedBy('')).toBeNull();
    expect(resolveCommentCreatedBy(null)).toBeNull();
    expect(resolveCommentCreatedBy(undefined)).toBeNull();
  });
});
