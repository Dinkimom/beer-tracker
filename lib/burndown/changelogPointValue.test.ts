import { describe, expect, it } from 'vitest';

import { changelogPointOrZero, readChangelogPointValue } from './changelogPointValue';

describe('readChangelogPointValue', () => {
  it('reads numbers and numeric strings', () => {
    expect(readChangelogPointValue(5)).toBe(5);
    expect(readChangelogPointValue('0.3')).toBe(0.3);
    expect(readChangelogPointValue('')).toBeNull();
    expect(readChangelogPointValue('soon')).toBeNull();
  });

  it('reads Jira changelog objects', () => {
    expect(readChangelogPointValue({ display: '1', id: '1', key: '1' })).toBe(1);
    expect(readChangelogPointValue({ display: '0.3', id: '0.3', key: '0.3' })).toBe(0.3);
  });

  it('treats empty changelog endpoints as zero for deltas', () => {
    expect(changelogPointOrZero(null)).toBe(0);
    expect(changelogPointOrZero(undefined)).toBe(0);
  });
});
