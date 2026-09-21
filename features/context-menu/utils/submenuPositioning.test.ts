import { afterEach, describe, expect, it, vi } from 'vitest';

import { calculateSubmenuPosition } from './submenuPositioning';

function rect(partial: {
  left: number;
  top: number;
  width: number;
  height: number;
}): DOMRect {
  const right = partial.left + partial.width;
  const bottom = partial.top + partial.height;
  return {
    x: partial.left,
    y: partial.top,
    left: partial.left,
    top: partial.top,
    width: partial.width,
    height: partial.height,
    right,
    bottom,
    toJSON: () => ({}),
  };
}

describe('calculateSubmenuPosition', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('places submenu to the right of the menu when there is room', () => {
    vi.stubGlobal('window', { innerWidth: 1200, innerHeight: 800 });

    const menuRect = rect({ left: 100, top: 100, width: 220, height: 300 });
    const buttonRect = rect({ left: 100, top: 120, width: 220, height: 44 });
    const subMenuRect = rect({ left: 0, top: 0, width: 240, height: 200 });
    const parentRect = rect({ left: 100, top: 120, width: 220, height: 44 });

    const { left, top } = calculateSubmenuPosition(menuRect, buttonRect, subMenuRect, parentRect);

    expect(left).toBe(222);
    expect(top).toBe(0);
  });

  it('flips to the left when there is not enough room on the right', () => {
    vi.stubGlobal('window', { innerWidth: 800, innerHeight: 800 });

    const menuRect = rect({ left: 520, top: 100, width: 220, height: 300 });
    const buttonRect = rect({ left: 520, top: 120, width: 220, height: 44 });
    const subMenuRect = rect({ left: 0, top: 0, width: 240, height: 200 });
    const parentRect = rect({ left: 520, top: 120, width: 220, height: 44 });

    const { left } = calculateSubmenuPosition(menuRect, buttonRect, subMenuRect, parentRect);

    expect(left).toBe(-242);
  });

  it('clamps to the viewport when flipped submenu would overflow the left edge', () => {
    vi.stubGlobal('window', { innerWidth: 500, innerHeight: 800 });

    const menuRect = rect({ left: 200, top: 100, width: 220, height: 300 });
    const buttonRect = rect({ left: 200, top: 120, width: 220, height: 44 });
    const subMenuRect = rect({ left: 0, top: 0, width: 240, height: 200 });
    const parentRect = rect({ left: 200, top: 120, width: 220, height: 44 });

    const { left } = calculateSubmenuPosition(menuRect, buttonRect, subMenuRect, parentRect);

    // left edge of submenu at viewport x=10
    expect(parentRect.left + left).toBe(10);
  });
});
