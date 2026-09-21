import { describe, expect, it } from 'vitest';

import { normalizeOptionalStaffText, normalizeStaffEmail } from './adminStaffRouteHelpers';

describe('adminStaffRouteHelpers normalize', () => {
  it('trims optional text to null when empty', () => {
    expect(normalizeOptionalStaffText('  uid  ')).toBe('uid');
    expect(normalizeOptionalStaffText('   ')).toBeNull();
    expect(normalizeOptionalStaffText(null)).toBeNull();
  });

  it('lowercases email and drops blanks', () => {
    expect(normalizeStaffEmail('  Ada@Example.com ')).toBe('ada@example.com');
    expect(normalizeStaffEmail('')).toBeNull();
  });
});
