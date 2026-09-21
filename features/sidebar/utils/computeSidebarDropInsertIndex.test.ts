import { describe, expect, it } from 'vitest';

import { computeSidebarDropInsertIndex } from './computeSidebarDropInsertIndex';

describe('computeSidebarDropInsertIndex', () => {
  const rects = new Map<string, DOMRect>([
    ['a', { top: 100, height: 80 } as DOMRect],
    ['b', { top: 200, height: 80 } as DOMRect],
    ['c', { top: 300, height: 80 } as DOMRect],
  ]);

  it('returns 0 for empty list', () => {
    expect(computeSidebarDropInsertIndex([], () => undefined, 150)).toBe(0);
  });

  it('inserts before first item when pointer is above its midpoint', () => {
    expect(computeSidebarDropInsertIndex(['a', 'b'], (id) => rects.get(id), 130)).toBe(0);
  });

  it('inserts between items', () => {
    expect(computeSidebarDropInsertIndex(['a', 'b', 'c'], (id) => rects.get(id), 220)).toBe(1);
  });

  it('appends when pointer is below last item', () => {
    expect(computeSidebarDropInsertIndex(['a', 'b'], (id) => rects.get(id), 400)).toBe(2);
  });
});
