'use client';

import type { CSSProperties } from 'react';

import {
  PLANNER_HATCH_TONES,
  plannerAvailabilityEmojiPattern,
  plannerEmojiPatternImage,
  plannerHatchImage,
  resolvePlannerEmojiPatternTile,
  type PlannerHatchTone,
} from '@/features/sprint/components/SprintPlanner/layout/plannerHatchTones';
import {
  WEEKEND_PATTERN_TILE_HEIGHT_PX,
  WEEKEND_PATTERN_TILE_WIDTH_PX,
  plannerWeekendPatternImage,
} from '@/features/sprint/components/SprintPlanner/layout/plannerWeekendPattern';

interface PlannerHatchOverlayProps {
  /** Высота полосы: от неё считается шаг между значками. */
  heightPx?: number;
  /**
   * Сдвиг общего листа. Для выходных соседние строки и дни
   * смотрят в одну картинку, а не начинают узор заново.
   */
  patternOffset?: { x: number; y: number };
  /** По умолчанию нейтральная штриховка «не слот». weekend / отпуска / shards — emoji-паттерн. */
  tone?: PlannerHatchTone;
}

function emojiPatternStyle(
  tone: Exclude<PlannerHatchTone, 'neutral'>,
  opacity: number,
  heightPx: number | undefined,
  patternOffset: { x: number; y: number } | undefined
): CSSProperties {
  if (tone === 'weekend') {
    const offset = patternOffset ?? { x: 0, y: 0 };
    return {
      backgroundImage: plannerWeekendPatternImage(opacity),
      backgroundPosition: `${-offset.x}px ${-offset.y}px`,
      backgroundRepeat: 'repeat',
      backgroundSize: `${WEEKEND_PATTERN_TILE_WIDTH_PX}px ${WEEKEND_PATTERN_TILE_HEIGHT_PX}px`,
    };
  }
  const tile = resolvePlannerEmojiPatternTile(heightPx);
  const emojis = plannerAvailabilityEmojiPattern(tone)?.emojis ?? [];
  return {
    backgroundImage: plannerEmojiPatternImage(emojis, opacity, tile.tileHeightPx),
    backgroundRepeat: 'repeat',
    backgroundSize: `${tile.tileWidthPx}px ${tile.tileHeightPx}px`,
  };
}

/** Фон недоступности: цвет тона + emoji-паттерн (отсутствия, выходные) или диагональ (neutral). */
export function PlannerHatchOverlay({
  heightPx,
  patternOffset,
  tone = 'neutral',
}: PlannerHatchOverlayProps) {
  const colors = PLANNER_HATCH_TONES[tone];
  const emojiPattern = plannerAvailabilityEmojiPattern(tone);

  if (emojiPattern && tone !== 'neutral') {
    const lightPattern = emojiPatternStyle(
      tone,
      emojiPattern.lightOpacity,
      heightPx,
      patternOffset
    );
    const darkPattern = emojiPatternStyle(
      tone,
      emojiPattern.darkOpacity,
      heightPx,
      patternOffset
    );
    return (
      <>
        {colors.lightFill ? (
          <div
            className="pointer-events-none absolute inset-0 dark:hidden"
            style={{ backgroundColor: colors.lightFill }}
          />
        ) : null}
        {colors.darkFill ? (
          <div
            className="pointer-events-none absolute inset-0 hidden dark:block"
            style={{ backgroundColor: colors.darkFill }}
          />
        ) : null}
        <div
          className="pointer-events-none absolute inset-0 dark:hidden"
          style={lightPattern}
        />
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          style={darkPattern}
        />
      </>
    );
  }

  return (
    <>
      {colors.lightFill ? (
        <div
          className="pointer-events-none absolute inset-0 dark:hidden"
          style={{ backgroundColor: colors.lightFill }}
        />
      ) : null}
      {colors.darkFill ? (
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{ backgroundColor: colors.darkFill }}
        />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 dark:hidden"
        style={{ backgroundImage: plannerHatchImage(colors.lightLine) }}
      />
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block"
        style={{ backgroundImage: plannerHatchImage(colors.darkLine) }}
      />
    </>
  );
}
