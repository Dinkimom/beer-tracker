import { describe, expect, it } from 'vitest';

import { parsePositiveDecimalId } from './parsePositiveDecimalId';

describe('parsePositiveDecimalId', () => {
  it('accepts Rapid View / board ids', () => {
    expect(parsePositiveDecimalId('14684')).toBe(14684);
    expect(parsePositiveDecimalId(' 1 ')).toBe(1);
  });

  it('rejects empty, zero, and non-decimal', () => {
    expect(parsePositiveDecimalId(null)).toBeNull();
    expect(parsePositiveDecimalId('')).toBeNull();
    expect(parsePositiveDecimalId('0')).toBeNull();
    expect(parsePositiveDecimalId('014684')).toBeNull();
    expect(parsePositiveDecimalId('board 14684')).toBeNull();
  });
});
