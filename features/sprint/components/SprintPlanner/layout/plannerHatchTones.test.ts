import { describe, expect, it } from 'vitest';

import {
  PLANNER_EMOJI_PATTERN_TILE_HEIGHT_PX,
  PLANNER_EMOJI_PATTERN_TILE_WIDTH_PX,
  PLANNER_HATCH_TONES,
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

  it('scatters a skull and a tombstone the same way as an absence', () => {
    const shards = plannerAvailabilityEmojiPattern('shards');
    const vacation = plannerAvailabilityEmojiPattern('vacation');
    expect(shards?.emojis).toEqual(['💀', '🪦']);
    expect(shards?.lightOpacity).toBe(vacation?.lightOpacity);
    expect(shards?.darkOpacity).toBe(vacation?.darkOpacity);
    expect(PLANNER_HATCH_TONES.shards.lightFill).toBeUndefined();
    expect(PLANNER_HATCH_TONES.shards.darkFill).toBeUndefined();
  });

  it('uses the same scatter pattern for weekend columns', () => {
    const weekend = plannerAvailabilityEmojiPattern('weekend');
    const vacation = plannerAvailabilityEmojiPattern('vacation');
    expect(weekend?.emojis).toEqual(['😴', '☕', '🏡']);
    expect(weekend?.lightOpacity).toBe(vacation?.lightOpacity);
    expect(weekend?.darkOpacity).toBe(vacation?.darkOpacity);
    expect(PLANNER_HATCH_TONES.weekend.lightFill).toBeDefined();
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
    expect(svg).toContain(`x="${Math.round(14 * tile.scale)}" y="${Math.round(32 * tile.scale)}"`);
    expect(svg).toContain('font-size="20"');
    expect(emojiAnchorsStayApart(svg, tile.tileWidthPx, tile.tileHeightPx)).toBe(true);
  });
});

function emojiAnchorsStayApart(svg: string, tileWidth: number, tileHeight: number): boolean {
  const anchors = [...svg.matchAll(/x="(\d+)" y="(\d+)" font-size="(\d+)"/g)].map((match) => ({
    size: Number(match[3]),
    x: Number(match[1]) + Number(match[3]) / 2,
    y: Number(match[2]) - Number(match[3]) * 0.35,
  }));
  for (let i = 0; i < anchors.length; i += 1) {
    for (let j = i + 1; j < anchors.length; j += 1) {
      const left = anchors[i];
      const right = anchors[j];
      if (!left || !right) {
        continue;
      }
      const dx = Math.abs(left.x - right.x);
      const dy = Math.abs(left.y - right.y);
      const distance = Math.hypot(
        Math.min(dx, tileWidth - dx),
        Math.min(dy, tileHeight - dy)
      );
      if (distance < (left.size + right.size) / 2) {
        return false;
      }
    }
  }
  return anchors.length > 1;
}
