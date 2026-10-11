'use client';

import {
  PLANNER_HATCH_TONES,
  plannerAvailabilityEmojiPattern,
  plannerEmojiPatternImage,
  plannerHatchImage,
  resolvePlannerEmojiPatternTile,
  type PlannerHatchTone,
} from '@/features/sprint/components/SprintPlanner/layout/plannerHatchTones';

interface PlannerHatchOverlayProps {
  /** Высота полосы: от неё считается шаг между значками. */
  heightPx?: number;
  /** По умолчанию нейтральная штриховка «не слот». Цветные тона — отпуска и др. */
  tone?: PlannerHatchTone;
}

/** Фон недоступности: цвет тона + emoji-паттерн или диагональ. */
export function PlannerHatchOverlay({ heightPx, tone = 'neutral' }: PlannerHatchOverlayProps) {
  const colors = PLANNER_HATCH_TONES[tone];
  const emojiPattern = plannerAvailabilityEmojiPattern(tone);

  if (emojiPattern) {
    const tile = resolvePlannerEmojiPatternTile(heightPx);
    const tileWidth = `${tile.tileWidthPx}px`;
    const tileHeight = `${tile.tileHeightPx}px`;
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
          style={{
            backgroundImage: plannerEmojiPatternImage(
              emojiPattern.emojis,
              emojiPattern.lightOpacity,
              tile.tileHeightPx
            ),
            backgroundRepeat: 'repeat',
            backgroundSize: `${tileWidth} ${tileHeight}`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{
            backgroundImage: plannerEmojiPatternImage(
              emojiPattern.emojis,
              emojiPattern.darkOpacity,
              tile.tileHeightPx
            ),
            backgroundRepeat: 'repeat',
            backgroundSize: `${tileWidth} ${tileHeight}`,
          }}
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
