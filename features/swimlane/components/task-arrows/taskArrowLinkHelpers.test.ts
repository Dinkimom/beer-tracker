import { describe, expect, it } from 'vitest';

import {
  mixHexColors,
  resolveTaskLinkArrowHeadProps,
  resolveTaskLinkArrowPaintColor,
  TASK_LINK_ARROW_HEAD_SHAPE,
} from './taskArrowLinkHelpers';

describe('resolveTaskLinkArrowHeadProps', () => {
  it('paints the open chevron with stroke so the tip stays rounded, not filled', () => {
    expect(resolveTaskLinkArrowHeadProps('#60a5fa')).toEqual({
      fill: 'none',
      stroke: '#60a5fa',
      style: { transition: 'stroke 0.2s ease, fill 0.2s ease' },
    });
  });
});

describe('TASK_LINK_ARROW_HEAD_SHAPE', () => {
  it('extends the shaft to the chevron tip so the crotch is not a hole', () => {
    expect(TASK_LINK_ARROW_HEAD_SHAPE.offsetForward).toBe(0.82);
  });
});

describe('mixHexColors / resolveTaskLinkArrowPaintColor', () => {
  it('mixes two opaque hex colors', () => {
    expect(mixHexColors('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('keeps full base color when emphasized', () => {
    expect(resolveTaskLinkArrowPaintColor('#3b82f6', true, false)).toBe('#3b82f6');
  });

  it('returns an opaque muted hex when idle (no rgba)', () => {
    const idle = resolveTaskLinkArrowPaintColor('#3b82f6', false, false);
    expect(idle.startsWith('#')).toBe(true);
    expect(idle).not.toContain('rgba');
    expect(idle.toLowerCase()).not.toBe('#3b82f6');
  });

  it('keeps dark idle darker than light idle but still distinct from full color', () => {
    const lightIdle = resolveTaskLinkArrowPaintColor('#3b82f6', false, false);
    const darkIdle = resolveTaskLinkArrowPaintColor('#3b82f6', false, true);
    const channelSum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255);
    };
    expect(channelSum(darkIdle)).toBeLessThan(channelSum(lightIdle));
    expect(darkIdle.toLowerCase()).not.toBe('#3b82f6');
    // Чуть явнее прежнего mix к #1f2937 @ 0.82 (~#253956)
    expect(channelSum(darkIdle)).toBeGreaterThan(channelSum('#253956'));
  });
});
