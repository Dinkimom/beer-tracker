import { describe, expect, it } from 'vitest';

import { computeHorizontalScrollFadeEdges } from './sidebarTabsScrollFadeHelpers';

describe('computeHorizontalScrollFadeEdges', () => {
  it('hides both fades when content fits', () => {
    expect(
      computeHorizontalScrollFadeEdges({
        clientWidth: 300,
        scrollLeft: 0,
        scrollWidth: 280,
      })
    ).toEqual({ showLeft: false, showRight: false });
  });

  it('shows only right fade at the start when overflowing', () => {
    expect(
      computeHorizontalScrollFadeEdges({
        clientWidth: 200,
        scrollLeft: 0,
        scrollWidth: 400,
      })
    ).toEqual({ showLeft: false, showRight: true });
  });

  it('shows only left fade at the end when overflowing', () => {
    expect(
      computeHorizontalScrollFadeEdges({
        clientWidth: 200,
        scrollLeft: 200,
        scrollWidth: 400,
      })
    ).toEqual({ showLeft: true, showRight: false });
  });

  it('shows both fades in the middle', () => {
    expect(
      computeHorizontalScrollFadeEdges({
        clientWidth: 200,
        scrollLeft: 80,
        scrollWidth: 400,
      })
    ).toEqual({ showLeft: true, showRight: true });
  });

  it('treats near-zero scroll as start (subpixel)', () => {
    expect(
      computeHorizontalScrollFadeEdges({
        clientWidth: 200,
        scrollLeft: 0.4,
        scrollWidth: 400,
      })
    ).toEqual({ showLeft: false, showRight: true });
  });
});
