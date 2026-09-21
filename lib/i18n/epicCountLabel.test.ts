import { describe, expect, it } from 'vitest';

import { formatEpicCountLabel } from './epicCountLabel';

function mockT(key: string, params?: Record<string, number | string>): string {
  const count = params?.count ?? '';
  if (key === 'planning.shared.epicCount.one') return `${count}:one`;
  if (key === 'planning.shared.epicCount.few') return `${count}:few`;
  if (key === 'planning.shared.epicCount.many') return `${count}:many`;
  return key;
}

describe('formatEpicCountLabel', () => {
  it('uses one for 1 and 21', () => {
    expect(formatEpicCountLabel(1, mockT)).toBe('1:one');
    expect(formatEpicCountLabel(21, mockT)).toBe('21:one');
  });

  it('uses few for 2–4 except 12–14', () => {
    expect(formatEpicCountLabel(2, mockT)).toBe('2:few');
    expect(formatEpicCountLabel(4, mockT)).toBe('4:few');
    expect(formatEpicCountLabel(22, mockT)).toBe('22:few');
  });

  it('uses many for 5–20 and 11–14', () => {
    expect(formatEpicCountLabel(5, mockT)).toBe('5:many');
    expect(formatEpicCountLabel(11, mockT)).toBe('11:many');
    expect(formatEpicCountLabel(12, mockT)).toBe('12:many');
    expect(formatEpicCountLabel(0, mockT)).toBe('0:many');
  });
});
