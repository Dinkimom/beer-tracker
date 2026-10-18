import { WEEKEND_EMOJIS } from '@/features/sprint/components/SprintPlanner/layout/plannerHatchTones';

/** Ячейка примерно на день × строку. Тайл шире и выше, чтобы стык не попадал на каждую строку. */
const CELL_WIDTH_PX = 120;
const CELL_HEIGHT_PX = 82;
const CELL_COLUMNS = 7;
const CELL_ROWS = 6;
const COPIES_PER_CELL = 2;

export const WEEKEND_PATTERN_TILE_WIDTH_PX = CELL_WIDTH_PX * CELL_COLUMNS;
export const WEEKEND_PATTERN_TILE_HEIGHT_PX = CELL_HEIGHT_PX * CELL_ROWS;

const EMOJI_FONT =
  'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Twemoji Mozilla, sans-serif';

interface WeekendPatternSlot {
  emoji: string;
  opacity: number;
  rotate: number;
  size: number;
  x: number;
  y: number;
}

function unit(seed: number): number {
  let hash = seed | 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}

/**
 * Отступ центра от края своей половинки.
 * Два значка делят ячейку по вертикали, поэтому случайный сдвиг не сводит их.
 */
const CENTER_INSET_PX = 22;

/**
 * Разброс значков на весь тайл. x/y — центр глифа.
 * В ячейке два значка, каждый в своей половине, с запасом до соседей и до стыка тайла.
 */
export function buildWeekendPatternSlots(): readonly WeekendPatternSlot[] {
  const emojis = WEEKEND_EMOJIS;
  const slots: WeekendPatternSlot[] = [];
  const halfWidth = CELL_WIDTH_PX / COPIES_PER_CELL;
  const spanX = halfWidth - CENTER_INSET_PX * 2;
  const spanY = CELL_HEIGHT_PX - CENTER_INSET_PX * 2;
  let seed = 1;
  const next = () => {
    seed += 1;
    return unit(seed);
  };
  for (let row = 0; row < CELL_ROWS; row += 1) {
    for (let col = 0; col < CELL_COLUMNS; col += 1) {
      for (let copy = 0; copy < COPIES_PER_CELL; copy += 1) {
        const emoji = emojis[Math.floor(next() * emojis.length)] ?? emojis[0];
        const originX = col * CELL_WIDTH_PX + copy * halfWidth;
        slots.push({
          emoji,
          opacity: 0.45 + next() * 0.55,
          rotate: Math.round((next() - 0.5) * 36),
          size: 14 + Math.floor(next() * 7),
          x: Math.round(originX + CENTER_INSET_PX + next() * spanX),
          y: Math.round(row * CELL_HEIGHT_PX + CENTER_INSET_PX + next() * spanY),
        });
      }
    }
  }
  return slots;
}

function weekendPatternSvg(opacity: number): string {
  const texts = buildWeekendPatternSlots()
    .map((slot) => {
      const slotOpacity = (opacity * slot.opacity).toFixed(3);
      return `<text x="${slot.x}" y="${slot.y}" text-anchor="middle" dominant-baseline="central" font-size="${slot.size}" opacity="${slotOpacity}" font-family="${EMOJI_FONT}" transform="rotate(${slot.rotate} ${slot.x} ${slot.y})">${slot.emoji}</text>`;
    })
    .join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WEEKEND_PATTERN_TILE_WIDTH_PX}" height="${WEEKEND_PATTERN_TILE_HEIGHT_PX}" viewBox="0 0 ${WEEKEND_PATTERN_TILE_WIDTH_PX} ${WEEKEND_PATTERN_TILE_HEIGHT_PX}">
  ${texts}
</svg>`;
}

const imageCache = new Map<number, string>();

export function plannerWeekendPatternImage(opacity: number): string {
  const cached = imageCache.get(opacity);
  if (cached) {
    return cached;
  }
  const image = `url("data:image/svg+xml,${encodeURIComponent(weekendPatternSvg(opacity))}")`;
  imageCache.set(opacity, image);
  return image;
}
