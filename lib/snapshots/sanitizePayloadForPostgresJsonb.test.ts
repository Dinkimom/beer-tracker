import { describe, expect, it } from 'vitest';

import {
  deepSanitizeForPostgresJsonb,
  sanitizeStringForPostgresJsonb,
  stringifyForPostgresJsonb,
} from './sanitizePayloadForPostgresJsonb';

describe('sanitizeStringForPostgresJsonb', () => {
  it('removes NUL', () => {
    expect(sanitizeStringForPostgresJsonb('a\u0000b')).toBe('ab');
  });

  it('replaces lone high surrogate', () => {
    expect(sanitizeStringForPostgresJsonb('\uD800')).toBe('\uFFFD');
  });

  it('replaces lone low surrogate', () => {
    expect(sanitizeStringForPostgresJsonb('\uDC00')).toBe('\uFFFD');
  });

  it('keeps valid surrogate pair', () => {
    const s = '\uD83D\uDE00';
    expect(sanitizeStringForPostgresJsonb(s)).toBe(s);
  });
});

describe('stringifyForPostgresJsonb', () => {
  it('sanitizes nested strings', () => {
    const raw = { summary: 'x\u0000y', nested: { t: '\uDC00' } };
    const json = stringifyForPostgresJsonb(raw);
    expect(json).not.toContain('\\u0000');
    const parsed = JSON.parse(json) as { nested: { t: string }; summary: string };
    expect(parsed.summary).toBe('xy');
    expect(parsed.nested.t).toBe('\uFFFD');
  });
});

describe('deepSanitizeForPostgresJsonb', () => {
  it('passes through numbers and null', () => {
    expect(deepSanitizeForPostgresJsonb(42)).toBe(42);
    expect(deepSanitizeForPostgresJsonb(null)).toBe(null);
  });
});
