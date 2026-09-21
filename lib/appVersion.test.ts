import { describe, expect, it } from 'vitest';

import { formatAppVersionLabel } from '@/lib/appVersion';

describe('formatAppVersionLabel', () => {
  it('joins package version and git sha', () => {
    expect(formatAppVersionLabel('0.2.1', 'd686393')).toBe('0.2.1 (d686393)');
  });

  it('uses package version when sha is empty', () => {
    expect(formatAppVersionLabel('0.2.1', '  ')).toBe('0.2.1');
  });

  it('uses git sha when package version is empty', () => {
    expect(formatAppVersionLabel('', 'd686393')).toBe('d686393');
  });

  it('falls back to dev when both are empty', () => {
    expect(formatAppVersionLabel(' ', '')).toBe('dev');
  });
});
