import { describe, expect, it } from 'vitest';

import { formatAppVersionLabel } from '@/lib/appVersion';

describe('formatAppVersionLabel', () => {
  it('uses package version', () => {
    expect(formatAppVersionLabel(' 0.2.1 ')).toBe('0.2.1');
  });

  it('falls back to dev when version is empty', () => {
    expect(formatAppVersionLabel(' ')).toBe('dev');
  });
});
