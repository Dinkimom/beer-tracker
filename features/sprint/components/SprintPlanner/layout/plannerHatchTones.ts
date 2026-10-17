import type { AvailabilityCardKind } from '@/features/swimlane/utils/availabilityCardKind';

export type PlannerHatchTone = AvailabilityCardKind | 'neutral' | 'shards' | 'weekend';

interface PlannerHatchToneColors {
  darkFill?: string;
  darkLine: string;
  lightFill?: string;
  lightLine: string;
}

export function plannerHatchImage(line: string): string {
  return `repeating-linear-gradient(-45deg, transparent 0 5px, ${line} 5px 6px)`;
}

/**
 * Высота тайла на одну карточку — стандартная строка свимлейна (82px).
 * Ширина больше высоты, чтобы значки оставались разбросанными по дням.
 */
export const PLANNER_EMOJI_PATTERN_TILE_HEIGHT_PX = 82;
export const PLANNER_EMOJI_PATTERN_TILE_WIDTH_PX = 260;
/**
 * Доля, на которую шаг растёт вместе с лишней высотой.
 * 1 — шаг как высота строки, меньше — на высоких строках узор плотнее.
 */
const PLANNER_EMOJI_PATTERN_HEIGHT_GROWTH = 0.6;

const PLANNER_AVAILABILITY_EMOJI_SETS: Record<
  AvailabilityCardKind,
  readonly string[]
> = {
  duty: ['🛟', '⚡', '📞'],
  sick_leave: ['🍋', '🤒', '💊'],
  'tech-sprint-back': ['⚙️', '🗄️', '🔧'],
  'tech-sprint-qa': ['🧪', '🐛', '✅'],
  'tech-sprint-web': ['🌐', '💻', '🎨'],
  vacation: ['🏖️', '🌴', '✈️'],
};

interface EmojiPatternSlot {
  emojiIndex: number;
  o: number;
  rotate: number;
  size: number;
  x: number;
  y: number;
}

/** Значки целиком помещаются в полосу одной карточки, шаг и поворот разные. */
const EMOJI_PATTERN_SLOTS: readonly EmojiPatternSlot[] = [
  { emojiIndex: 0, o: 1, rotate: -14, size: 20, x: 16, y: 34 },
  { emojiIndex: 2, o: 0.68, rotate: 16, size: 15, x: 78, y: 64 },
  { emojiIndex: 1, o: 0.9, rotate: 7, size: 18, x: 132, y: 30 },
  { emojiIndex: 0, o: 0.52, rotate: -20, size: 14, x: 188, y: 68 },
  { emojiIndex: 2, o: 0.84, rotate: 11, size: 17, x: 228, y: 38 },
  { emojiIndex: 1, o: 0.62, rotate: -8, size: 16, x: 48, y: 50 },
];

/** Череп и надгробие в колонке за концом недели, если карточка вылезла за сетку. */
const OVERFLOW_GRAVE_EMOJIS = ['💀', '🪦'] as const;
/** Выходной / нерабочий день на свимлейне — тот же scatter, что у отсутствий. */
const WEEKEND_EMOJIS = ['😴', '☕', '🏡'] as const;

interface EmojiPatternSpec {
  darkOpacity: number;
  emojis: readonly string[];
  lightOpacity: number;
}

interface EmojiPatternTile {
  scale: number;
  tileHeightPx: number;
  tileWidthPx: number;
}

/** Шаг значков растёт медленнее высоты строки. На одну карточку масштаб равен 1. */
export function resolvePlannerEmojiPatternTile(heightPx?: number): EmojiPatternTile {
  const requested = heightPx != null && Number.isFinite(heightPx) && heightPx > 0
    ? heightPx
    : PLANNER_EMOJI_PATTERN_TILE_HEIGHT_PX;
  const rowUnits = Math.max(1, requested / PLANNER_EMOJI_PATTERN_TILE_HEIGHT_PX);
  const scale = 1 + (rowUnits - 1) * PLANNER_EMOJI_PATTERN_HEIGHT_GROWTH;
  return {
    scale,
    tileHeightPx: Math.round(PLANNER_EMOJI_PATTERN_TILE_HEIGHT_PX * scale),
    tileWidthPx: Math.round(PLANNER_EMOJI_PATTERN_TILE_WIDTH_PX * scale),
  };
}

function emojiPatternSvg(
  emojis: readonly string[],
  opacity: number,
  tile: EmojiPatternTile
): string {
  const font =
    'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Twemoji Mozilla, sans-serif';
  const texts = emojis.length === 0 ? [] : EMOJI_PATTERN_SLOTS.map((slot) => {
    const emoji = emojis[slot.emojiIndex % emojis.length] ?? '';
    const x = Math.round(slot.x * tile.scale);
    const y = Math.round(slot.y * tile.scale);
    return `<text x="${x}" y="${y}" font-size="${slot.size}" opacity="${opacity * slot.o}" font-family="${font}" transform="rotate(${slot.rotate} ${x} ${y})">${emoji}</text>`;
  }).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tile.tileWidthPx}" height="${tile.tileHeightPx}" viewBox="0 0 ${tile.tileWidthPx} ${tile.tileHeightPx}">
  ${texts}
</svg>`;
}

export function plannerEmojiPatternImage(
  emojis: readonly string[],
  opacity: number,
  heightPx?: number
): string {
  return `url("data:image/svg+xml,${encodeURIComponent(emojiPatternSvg(emojis, opacity, resolvePlannerEmojiPatternTile(heightPx)))}")`;
}

function emojisForPlannerHatchTone(
  tone: Exclude<PlannerHatchTone, 'neutral'>
): readonly string[] {
  if (tone === 'shards') {
    return OVERFLOW_GRAVE_EMOJIS;
  }
  if (tone === 'weekend') {
    return WEEKEND_EMOJIS;
  }
  return PLANNER_AVAILABILITY_EMOJI_SETS[tone];
}

export function plannerAvailabilityEmojiPattern(
  tone: PlannerHatchTone
): EmojiPatternSpec | null {
  if (tone === 'neutral') {
    return null;
  }
  return {
    darkOpacity: 0.26,
    emojis: emojisForPlannerHatchTone(tone),
    lightOpacity: 0.34,
  };
}

/** Базовый фон под штриховку — совпадает с TimelineGrid и чипами отсутствия. */
export const PLANNER_HATCH_BASE_CLASS = '!bg-white dark:!bg-gray-800';

export const PLANNER_HATCH_TONES: Record<PlannerHatchTone, PlannerHatchToneColors> = {
  neutral: {
    lightLine: 'rgb(0 0 0 / 0.06)',
    darkLine: 'rgb(255 255 255 / 0.07)',
  },
  vacation: {
    lightFill: 'rgb(254 243 199 / 0.55)',
    lightLine: 'rgb(245 158 11 / 0.42)',
    darkFill: 'rgb(120 53 15 / 0.45)',
    darkLine: 'rgb(251 191 36 / 0.45)',
  },
  sick_leave: {
    lightFill: 'rgb(255 228 230 / 0.55)',
    lightLine: 'rgb(244 63 94 / 0.4)',
    darkFill: 'rgb(136 19 55 / 0.45)',
    darkLine: 'rgb(251 113 133 / 0.45)',
  },
  duty: {
    lightFill: 'rgb(237 233 254 / 0.55)',
    lightLine: 'rgb(139 92 246 / 0.4)',
    darkFill: 'rgb(76 29 149 / 0.45)',
    darkLine: 'rgb(167 139 250 / 0.45)',
  },
  'tech-sprint-web': {
    lightFill: 'rgb(224 242 254 / 0.55)',
    lightLine: 'rgb(14 165 233 / 0.4)',
    darkFill: 'rgb(12 74 110 / 0.48)',
    darkLine: 'rgb(56 189 248 / 0.45)',
  },
  'tech-sprint-back': {
    lightFill: 'rgb(209 250 229 / 0.55)',
    lightLine: 'rgb(16 185 129 / 0.4)',
    darkFill: 'rgb(6 78 59 / 0.48)',
    darkLine: 'rgb(52 211 153 / 0.45)',
  },
  'tech-sprint-qa': {
    lightFill: 'rgb(255 237 213 / 0.55)',
    lightLine: 'rgb(249 115 22 / 0.4)',
    darkFill: 'rgb(124 45 18 / 0.45)',
    darkLine: 'rgb(251 146 60 / 0.45)',
  },
  shards: {
    lightLine: 'rgb(0 0 0 / 0.06)',
    darkLine: 'rgb(255 255 255 / 0.07)',
  },
  weekend: {
    lightFill: 'rgb(243 244 246 / 0.55)',
    lightLine: 'rgb(0 0 0 / 0.06)',
    darkFill: 'rgb(31 41 55 / 0.4)',
    darkLine: 'rgb(255 255 255 / 0.07)',
  },
};
