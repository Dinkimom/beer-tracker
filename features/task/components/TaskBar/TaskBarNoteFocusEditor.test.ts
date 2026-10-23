import { describe, expect, it } from 'vitest';

import { resolveNoteFocusHeight, resolveNoteFocusPose } from './TaskBarNoteFocusEditor';

describe('resolveNoteFocusPose', () => {
  it('keeps the card shape and caps the zoom for a small note', () => {
    const pose = resolveNoteFocusPose({ height: 72, width: 340 }, { height: 900, width: 1440 });
    expect(pose.scale).toBe(2.5);
    expect(pose.rotateDeg).toBe(0);
    expect(pose.centerX).toBe(720);
    expect(pose.centerY).toBe(426);
  });

  it('fits a tall note by height', () => {
    const pose = resolveNoteFocusPose({ height: 400, width: 200 }, { height: 900, width: 1440 });
    expect(pose.scale).toBeCloseTo(724 / 400);
  });

  it('grows a wide note up to the viewport edges', () => {
    const pose = resolveNoteFocusPose({ height: 120, width: 1100 }, { height: 900, width: 1440 });
    expect(pose.scale).toBeCloseTo(1312 / 1100);
  });

  it('shrinks a note larger than the viewport', () => {
    const pose = resolveNoteFocusPose({ height: 300, width: 800 }, { height: 600, width: 400 });
    expect(pose.scale).toBeCloseTo(272 / 800);
  });
});

describe('resolveNoteFocusHeight', () => {
  const viewport = { height: 900, width: 1440 };

  it('keeps the card height when the text fits', () => {
    expect(resolveNoteFocusHeight(120, 80, viewport)).toBe(120);
  });

  it('grows to fit the whole text', () => {
    expect(resolveNoteFocusHeight(72, 240.4, viewport)).toBe(241);
  });

  it('stops growing at the available viewport height', () => {
    expect(resolveNoteFocusHeight(72, 5000, viewport)).toBe(724);
  });
});
