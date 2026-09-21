import type { QuarterlyStoryEventKind } from '../types';

import { isQuarterlyStoryEventKind } from '@/lib/quarterlyPlans/storyEventHelpers';

export { isQuarterlyStoryEventKind };

export interface QuarterlyStoryEventCatalogEntry {
  emoji: string;
  kind: QuarterlyStoryEventKind;
}

/** Порядок пунктов в попапе добавления события */
export const QUARTERLY_STORY_EVENT_CATALOG: QuarterlyStoryEventCatalogEntry[] = [
  { kind: 'task_released', emoji: '✅' },
  { kind: 'not_taken_on_time', emoji: '❌' },
  { kind: 'slipped_new_expected', emoji: '🟠' },
  { kind: 'release_expected_this_week', emoji: '☑️' },
  { kind: 'delivery_as_planned', emoji: '⚒️' },
  { kind: 'discovery_as_planned', emoji: '🔍' },
];

const EMOJI_BY_KIND = new Map(
  QUARTERLY_STORY_EVENT_CATALOG.map((e) => [e.kind, e.emoji] as const)
);

/** Класс для насыщенного цветного emoji (не наследует Arial из globals). */
export const QUARTERLY_STORY_EVENT_EMOJI_CLASS =
  "text-lg leading-none [font-family:'Apple_Color_Emoji','Segoe_UI_Emoji','Noto_Color_Emoji',sans-serif]";

export function quarterlyStoryEventEmoji(kind: QuarterlyStoryEventKind): string {
  return EMOJI_BY_KIND.get(kind) ?? '•';
}
