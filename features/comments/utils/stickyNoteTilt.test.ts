import { describe, expect, it, vi } from 'vitest';

import {
  createIdKeepingStickyNoteTilt,
  resolveStickyNoteTiltDegrees,
  stickyNoteTiltSign,
} from './stickyNoteTilt';

const LEFT_ID = 'note-left';
const RIGHT_ID = 'note-right';

describe('stickyNoteTiltSign', () => {
  it('picks a stable side from the card id', () => {
    expect(stickyNoteTiltSign(LEFT_ID)).toBe(-1);
    expect(stickyNoteTiltSign(RIGHT_ID)).toBe(1);
    expect(stickyNoteTiltSign(LEFT_ID)).toBe(stickyNoteTiltSign(LEFT_ID));
  });
});

describe('resolveStickyNoteTiltDegrees', () => {
  it('tilts a small square note by the full angle, sign from the id', () => {
    expect(resolveStickyNoteTiltDegrees(80, 80, LEFT_ID)).toBe(-3);
    expect(resolveStickyNoteTiltDegrees(40, 40, RIGHT_ID)).toBe(3);
  });

  it('eases a square note down as it grows, without flattening it', () => {
    expect(resolveStickyNoteTiltDegrees(160, 160, LEFT_ID)).toBe(-2.5);
    expect(resolveStickyNoteTiltDegrees(480, 480, LEFT_ID)).toBe(-1.5);
    expect(Math.abs(resolveStickyNoteTiltDegrees(960, 960, LEFT_ID))).toBeGreaterThan(0);
  });

  it('halves the angle when one side is twice the other, then eases for size', () => {
    expect(resolveStickyNoteTiltDegrees(200, 100, LEFT_ID)).toBe(-1.15);
    expect(resolveStickyNoteTiltDegrees(100, 200, RIGHT_ID)).toBe(1.15);
  });

  it('keeps a 10:1 strip nearly flat', () => {
    expect(resolveStickyNoteTiltDegrees(1000, 100, LEFT_ID)).toBe(-0.09);
  });

  it('returns 0 when a side or the id is missing', () => {
    expect(resolveStickyNoteTiltDegrees(0, 40, LEFT_ID)).toBe(0);
    expect(resolveStickyNoteTiltDegrees(40, -10, LEFT_ID)).toBe(0);
    expect(resolveStickyNoteTiltDegrees(80, 80, '')).toBe(0);
  });
});

describe('createIdKeepingStickyNoteTilt', () => {
  const toCardId = (id: string) => `comment:${id}`;

  it('skips ids whose card would tilt to the other side', () => {
    const candidates = ['b', 'd', 'a', 'c'];
    const sign = stickyNoteTiltSign(LEFT_ID);
    const expected = candidates.find((id) => stickyNoteTiltSign(toCardId(id)) === sign);
    let index = 0;
    const id = createIdKeepingStickyNoteTilt(LEFT_ID, toCardId, () => candidates[index++]);
    expect(id).toBe(expected);
    expect(stickyNoteTiltSign(toCardId(id))).toBe(sign);
  });

  it('gives up after a bounded number of attempts', () => {
    const createId = vi.fn(() => 'same');
    const sign = stickyNoteTiltSign(toCardId('same'));
    const source = sign === stickyNoteTiltSign(LEFT_ID) ? RIGHT_ID : LEFT_ID;
    expect(createIdKeepingStickyNoteTilt(source, toCardId, createId)).toBe('same');
    expect(createId).toHaveBeenCalledTimes(16);
  });
});
