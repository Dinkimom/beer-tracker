import { describe, expect, it } from 'vitest';

import { sidebarResizeInlineIndicatorOpacityClass } from './sidebarResizeInlineIndicatorOpacityClass';

describe('sidebarResizeInlineIndicatorOpacityClass', () => {
  it('keeps the subtle always-visible affordance by default', () => {
    expect(sidebarResizeInlineIndicatorOpacityClass(false, false)).toBe(
      'opacity-40 group-hover:opacity-100'
    );
  });

  it('hides the indicator until hover when revealOnHover is set', () => {
    expect(sidebarResizeInlineIndicatorOpacityClass(true, false)).toBe(
      'opacity-0 group-hover:opacity-100'
    );
  });

  it('keeps the indicator visible while resizing', () => {
    expect(sidebarResizeInlineIndicatorOpacityClass(true, true)).toBe('opacity-100');
  });
});
