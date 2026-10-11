import { describe, expect, it } from 'vitest';

import {
  PLANNER_EMOJI_PATTERN_TILE_HEIGHT_PX,
  PLANNER_EMOJI_PATTERN_TILE_WIDTH_PX,
  plannerAvailabilityEmojiPattern,
  plannerEmojiPatternImage,
  resolvePlannerEmojiPatternTile,
} from './plannerHatchTones';

describe('resolvePlannerEmojiPatternTile', () => {
  it('uses one card row as the unit and grows the tile with the row', () => {
    expect(PLANNER_EMOJI_PATTERN_TILE_HEIGHT_PX).toBe(82);
    expect(PLANNER_EMOJI_PATTERN_TILE_WIDTH_PX).toBeGreaterThan(
      PLANNER_EMOJI_PATTERN_TILE_HEIGHT_PX
    );
    const oneCard = resolvePlannerEmojiPatternTile(82);
    const twoCards = resolvePlannerEmojiPatternTile(164);
    expect(oneCard.scale).toBe(1);
    expect(oneCard.tileHeightPx).toBe(82);
    expect(oneCard.tileWidthPx).toBe(PLANNER_EMOJI_PATTERN_TILE_WIDTH_PX);
    expect(twoCards.scale).toBeGreaterThan(1);
    expect(twoCards.scale).toBeLessThan(2);
    expect(twoCards.tileHeightPx).toBeLessThan(164);
    expect(twoCards.tileWidthPx).toBeGreaterThan(PLANNER_EMOJI_PATTERN_TILE_WIDTH_PX);
  });

  it('does not shrink below one card row', () => {
    expect(resolvePlannerEmojiPatternTile(40).tileHeightPx).toBe(
      PLANNER_EMOJI_PATTERN_TILE_HEIGHT_PX
    );
    expect(resolvePlannerEmojiPatternTile(undefined).scale).toBe(1);
  });
});

describe('plannerAvailabilityEmojiPattern', () => {
  it('shares opacity between vacation and duty', () => {
    const vacation = plannerAvailabilityEmojiPattern('vacation');
    const duty = plannerAvailabilityEmojiPattern('duty');
    expect(duty?.lightOpacity).toBe(vacation?.lightOpacity);
    expect(vacation?.emojis.length).toBeGreaterThan(1);
  });

  it('uses a mixed emoji set (≤3) for every availability kind', () => {
    expect(plannerAvailabilityEmojiPattern('sick_leave')?.emojis).toEqual([
      '🍋',
      '🤒',
      '💊',
    ]);
    expect(plannerAvailabilityEmojiPattern('vacation')?.emojis).toEqual([
      '🏖️',
      '🌴',
      '✈️',
    ]);
    expect(plannerAvailabilityEmojiPattern('duty')?.emojis).toEqual([
      '🛟',
      '⚡',
      '📞',
    ]);
  });

  it('uses a mixed emoji set (≤3) for tech-sprint kinds', () => {
    expect(plannerAvailabilityEmojiPattern('tech-sprint-web')?.emojis).toEqual([
      '🌐',
      '💻',
      '🎨',
    ]);
    expect(plannerAvailabilityEmojiPattern('tech-sprint-back')?.emojis).toEqual([
      '⚙️',
      '🗄️',
      '🔧',
    ]);
    expect(plannerAvailabilityEmojiPattern('tech-sprint-qa')?.emojis).toEqual([
      '🧪',
      '🐛',
      '✅',
    ]);
  });

  it('keeps diagonal hatch only for neutral cells', () => {
    expect(plannerAvailabilityEmojiPattern('neutral')).toBeNull();
  });
});

describe('plannerEmojiPatternImage', () => {
  it('embeds each emoji from the set in the svg data url', () => {
    const emojis = ['🍋', '🤒', '💊'] as const;
    const image = plannerEmojiPatternImage(emojis, 0.3);
    expect(image.startsWith('url("data:image/svg+xml,')).toBe(true);
    for (const emoji of emojis) {
      expect(image).toContain(encodeURIComponent(emoji));
    }
    const svg = decodeURIComponent(image);
    expect(svg.match(/<text /g)?.length).toBeGreaterThan(emojis.length);
    expect(svg).toContain('rotate(');
    expect(svg).toContain('height="82"');
  });

  it('spreads emoji anchors with the row and keeps the glyph size', () => {
    const tile = resolvePlannerEmojiPatternTile(164);
    const image = plannerEmojiPatternImage(['🏖️', '🌴', '✈️'], 0.3, 164);
    const svg = decodeURIComponent(image);
    expect(svg).toContain(`height="${tile.tileHeightPx}"`);
    expect(svg).toContain(`x="${Math.round(16 * tile.scale)}" y="${Math.round(34 * tile.scale)}"`);
    expect(svg).toContain('font-size="20"');
  });
});
