import { describe, expect, it } from 'vitest';

import { parseRegistryUuidString, REGISTRY_UUID_STRING_RE } from '@/lib/registryUuidString';

describe('REGISTRY_UUID_STRING_RE', () => {
  it('accepts registry uuid that fails strict RFC4122 variant (zod .uuid())', () => {
    expect(REGISTRY_UUID_STRING_RE.test('5430155e-d01e-11ea-fa98-fa163e1c52c6')).toBe(true);
    expect(REGISTRY_UUID_STRING_RE.test('99695f78-202c-11eb-6e9a-fa163e1c52c6')).toBe(true);
  });

  it('rejects non-hyphenated and wrong lengths', () => {
    expect(REGISTRY_UUID_STRING_RE.test('5430155ed01e11eafa98fa163e1c52c6')).toBe(false);
    expect(REGISTRY_UUID_STRING_RE.test('not-a-uuid')).toBe(false);
  });
});

describe('parseRegistryUuidString', () => {
  it('trims and accepts postgres uuid that fails zod .uuid()', () => {
    expect(parseRegistryUuidString('  5430155e-d01e-11ea-fa98-fa163e1c52c6  ')).toBe(
      '5430155e-d01e-11ea-fa98-fa163e1c52c6'
    );
  });

  it('returns null for empty and invalid values', () => {
    expect(parseRegistryUuidString(null)).toBeNull();
    expect(parseRegistryUuidString('')).toBeNull();
    expect(parseRegistryUuidString('not-a-uuid')).toBeNull();
  });
});
