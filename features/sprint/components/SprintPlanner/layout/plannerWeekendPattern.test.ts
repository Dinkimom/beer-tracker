import { describe, expect, it } from 'vitest';

import { WEEKEND_EMOJIS } from './plannerHatchTones';
import {
  WEEKEND_PATTERN_TILE_HEIGHT_PX,
  WEEKEND_PATTERN_TILE_WIDTH_PX,
  buildWeekendPatternSlots,
  plannerWeekendPatternImage,
} from './plannerWeekendPattern';

describe('buildWeekendPatternSlots', () => {
  it('scatters weekend emoji across a sheet taller than one lane and wider than one day', () => {
    const slots = buildWeekendPatternSlots();
    const ys = slots.map((slot) => slot.y);
    const xs = slots.map((slot) => slot.x);
    expect(WEEKEND_PATTERN_TILE_HEIGHT_PX).toBeGreaterThan(82 * 4);
    expect(WEEKEND_PATTERN_TILE_WIDTH_PX).toBeGreaterThan(260 * 2);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(82 * 3);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(260);
    const emojis = new Set(slots.map((slot) => slot.emoji));
    expect([...emojis].sort()).toEqual([...WEEKEND_EMOJIS].sort());
  });

  it('is stable between calls', () => {
    expect(buildWeekendPatternSlots()).toEqual(buildWeekendPatternSlots());
  });

  it('keeps emoji centers apart, including across the repeating tile seam', () => {
    const slots = buildWeekendPatternSlots();
    for (let i = 0; i < slots.length; i += 1) {
      for (let j = i + 1; j < slots.length; j += 1) {
        const left = slots[i];
        const right = slots[j];
        if (!left || !right) {
          continue;
        }
        const dx = Math.abs(left.x - right.x);
        const dy = Math.abs(left.y - right.y);
        const wrappedDx = Math.min(dx, WEEKEND_PATTERN_TILE_WIDTH_PX - dx);
        const wrappedDy = Math.min(dy, WEEKEND_PATTERN_TILE_HEIGHT_PX - dy);
        const distance = Math.hypot(wrappedDx, wrappedDy);
        const minDistance = (left.size + right.size) / 2;
        expect(distance).toBeGreaterThanOrEqual(minDistance);
      }
    }
  });
});

describe('plannerWeekendPatternImage', () => {
  it('embeds the large sheet as a repeating svg', () => {
    const image = plannerWeekendPatternImage(0.34);
    expect(image.startsWith('url("data:image/svg+xml,')).toBe(true);
    const svg = decodeURIComponent(image);
    expect(svg).toContain(`width="${WEEKEND_PATTERN_TILE_WIDTH_PX}"`);
    expect(svg).toContain(`height="${WEEKEND_PATTERN_TILE_HEIGHT_PX}"`);
    expect(svg).toContain('rotate(');
    expect(svg.match(/<text /g)?.length).toBe(buildWeekendPatternSlots().length);
  });
});
