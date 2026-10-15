import { createHash } from 'crypto';

import { describe, expect, it } from 'vitest';

import { verifyPkceS256 } from './pkce';

describe('verifyPkceS256', () => {
  it('accepts a matching verifier and challenge', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = createHash('sha256').update(verifier, 'utf8').digest('base64url');
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
  });

  it('rejects a wrong verifier', () => {
    const challenge = createHash('sha256').update('good-verifier', 'utf8').digest('base64url');
    expect(verifyPkceS256('bad-verifier', challenge)).toBe(false);
  });

  it('rejects empty inputs', () => {
    expect(verifyPkceS256('', 'x')).toBe(false);
    expect(verifyPkceS256('x', '')).toBe(false);
  });
});
