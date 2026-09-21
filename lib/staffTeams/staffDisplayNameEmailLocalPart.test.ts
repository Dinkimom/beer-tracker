import { describe, expect, it } from 'vitest';

import {
  displayNameLooksLikeEmailLocalPart,
  normalizedEmailLocalPart,
} from './staffDisplayNameEmailLocalPart';

describe('normalizedEmailLocalPart', () => {
  it('returns substring before @', () => {
    expect(normalizedEmailLocalPart('jane.doe@example.com')).toBe('jane.doe');
  });
});

describe('displayNameLooksLikeEmailLocalPart', () => {
  it('matches local part case-insensitively', () => {
    expect(
      displayNameLooksLikeEmailLocalPart('jane.doe@example.com', 'Jane.Doe')
    ).toBe(true);
  });

  it('returns false when display name is a full name', () => {
    expect(
      displayNameLooksLikeEmailLocalPart('jane.doe@example.com', 'Jane Doe')
    ).toBe(false);
  });

  it('returns false without email', () => {
    expect(displayNameLooksLikeEmailLocalPart(null, 'x')).toBe(false);
  });
});
