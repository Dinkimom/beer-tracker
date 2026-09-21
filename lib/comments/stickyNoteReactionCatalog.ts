/**
 * Каталог emoji для полного пикера реакций (локальный прототип).
 * Поисковые синонимы — `comments.reactionKeywords.*` в сервисе переводов.
 */

import { translate } from '@/lib/i18n/translator';

export const STICKY_NOTE_REACTION_CATEGORY_IDS = [
  'recent',
  'people',
  'nature',
  'food',
  'activity',
  'travel',
  'objects',
  'symbols',
  'flags',
] as const;

export type StickyNoteReactionCategoryId = (typeof STICKY_NOTE_REACTION_CATEGORY_IDS)[number];

export const STICKY_NOTE_REACTION_CATEGORY_ICON: Record<StickyNoteReactionCategoryId, string> = {
  activity: '🎾',
  flags: '🏁',
  food: '🍔',
  nature: '🐻',
  objects: '💡',
  people: '😊',
  recent: '🕒',
  symbols: '❤️',
  travel: '🚗',
};

export const STICKY_NOTE_REACTION_CATEGORY_TITLE_KEY: Record<StickyNoteReactionCategoryId, string> = {
  activity: 'comments.reactionCategoryActivity',
  flags: 'comments.reactionCategoryFlags',
  food: 'comments.reactionCategoryFood',
  nature: 'comments.reactionCategoryNature',
  objects: 'comments.reactionCategoryObjects',
  people: 'comments.reactionCategoryPeople',
  recent: 'comments.reactionCategoryRecent',
  symbols: 'comments.reactionCategorySymbols',
  travel: 'comments.reactionCategoryTravel',
};

interface CatalogEntry {
  emoji: string;
  keywordKey: string;
}

const PEOPLE: CatalogEntry[] = [
  e('😀', 'grinning'),
  e('😃', 'grinningOpen'),
  e('😄', 'grinningSquint'),
  e('😁', 'beaming'),
  e('😆', 'laugh'),
  e('😅', 'sweat'),
  e('😂', 'joy'),
  e('🤣', 'rofl'),
  e('😊', 'blush'),
  e('😇', 'angel'),
  e('🙂', 'slightSmile'),
  e('😉', 'wink'),
  e('😌', 'relieved'),
  e('😍', 'heartEyes'),
  e('🥰', 'smilingHearts'),
  e('😘', 'kiss'),
  e('😋', 'yum'),
  e('😜', 'winkTongue'),
  e('🤪', 'zany'),
  e('🤨', 'raisedEyebrow'),
  e('🧐', 'monocle'),
  e('🤓', 'nerd'),
  e('😎', 'cool'),
  e('🤩', 'starStruck'),
  e('🥳', 'party'),
  e('🤡', 'clown'),
  e('💩', 'poop'),
  e('😏', 'smirk'),
  e('😒', 'unamused'),
  e('😔', 'pensive'),
  e('😕', 'confused'),
  e('🙁', 'frown'),
  e('😣', 'persevere'),
  e('😫', 'tired'),
  e('🥺', 'pleading'),
  e('😢', 'cry'),
  e('😭', 'sob'),
  e('😤', 'huff'),
  e('😠', 'angry'),
  e('🤯', 'exploding'),
  e('😳', 'flushed'),
  e('😱', 'scream'),
  e('🤗', 'hug'),
  e('🤔', 'thinking'),
  e('🤭', 'giggle'),
  e('🤫', 'shush'),
  e('🫡', 'salute'),
  e('😐', 'neutral'),
  e('😬', 'grimace'),
  e('🙄', 'eyeRoll'),
  e('😴', 'sleep'),
  e('👍', 'thumbsUp'),
  e('👎', 'thumbsDown'),
  e('👏', 'clap'),
  e('🙌', 'raisedHands'),
  e('🤝', 'handshake'),
  e('👀', 'eyes'),
];

const NATURE: CatalogEntry[] = [
  e('🐶', 'dog'),
  e('🐱', 'cat'),
  e('🐻', 'bear'),
  e('🐼', 'panda'),
  e('🦊', 'fox'),
  e('🐸', 'frog'),
  e('🐵', 'monkey'),
  e('🦄', 'unicorn'),
  e('🐝', 'bee'),
  e('🌸', 'blossom'),
  e('🌞', 'sun'),
  e('⭐', 'star'),
  e('🌈', 'rainbow'),
  e('🔥', 'fire'),
  e('💧', 'droplet'),
  e('❄️', 'snow'),
];

const FOOD: CatalogEntry[] = [
  e('🍎', 'apple'),
  e('🍕', 'pizza'),
  e('🍔', 'burger'),
  e('🍟', 'fries'),
  e('🍣', 'sushi'),
  e('🍰', 'cake'),
  e('🍩', 'donut'),
  e('🍪', 'cookie'),
  e('☕', 'coffee'),
  e('🍺', 'beer'),
  e('🍷', 'wine'),
  e('🥤', 'cup'),
];

const ACTIVITY: CatalogEntry[] = [
  e('⚽', 'soccer'),
  e('🏀', 'basketball'),
  e('🎾', 'tennis'),
  e('🏆', 'trophy'),
  e('🎯', 'target'),
  e('🎮', 'game'),
  e('🎵', 'music'),
  e('🎬', 'movie'),
  e('✅', 'checkDone'),
  e('✔️', 'checkMark'),
];

const TRAVEL: CatalogEntry[] = [
  e('🚗', 'car'),
  e('🚕', 'taxi'),
  e('✈️', 'plane'),
  e('🚀', 'rocket'),
  e('🏠', 'house'),
  e('🏢', 'office'),
  e('🗺️', 'map'),
  e('🏝️', 'island'),
];

const OBJECTS: CatalogEntry[] = [
  e('💡', 'idea'),
  e('💻', 'laptop'),
  e('📱', 'phone'),
  e('⌚', 'watch'),
  e('🔑', 'key'),
  e('🔒', 'lock'),
  e('📌', 'pin'),
  e('📝', 'memo'),
  e('📦', 'package'),
  e('🎁', 'gift'),
];

const SYMBOLS: CatalogEntry[] = [
  e('❤️', 'heart'),
  e('🧡', 'orangeHeart'),
  e('💛', 'yellowHeart'),
  e('💚', 'greenHeart'),
  e('💙', 'blueHeart'),
  e('💜', 'purpleHeart'),
  e('🖤', 'blackHeart'),
  e('💯', 'hundred'),
  e('✨', 'sparkles'),
  e('➕', 'plus'),
  e('⚠️', 'warning'),
  e('❌', 'cross'),
  e('❓', 'question'),
  e('❗', 'exclamation'),
];

const FLAGS: CatalogEntry[] = [
  e('🏁', 'finishFlag'),
  e('🚩', 'redFlag'),
  e('🏳️', 'whiteFlag'),
  e('🇷🇺', 'russia'),
  e('🇺🇸', 'usa'),
  e('🇬🇧', 'uk'),
  e('🇪🇺', 'eu'),
];

const CATALOG: Record<Exclude<StickyNoteReactionCategoryId, 'recent'>, CatalogEntry[]> = {
  activity: ACTIVITY,
  flags: FLAGS,
  food: FOOD,
  nature: NATURE,
  objects: OBJECTS,
  people: PEOPLE,
  symbols: SYMBOLS,
  travel: TRAVEL,
};

const FLAT_ENTRIES: CatalogEntry[] = Object.values(CATALOG).flat();

const SEARCH_HAYSTACK: { emoji: string; haystack: string }[] = FLAT_ENTRIES.map((entry) => ({
  emoji: entry.emoji,
  haystack: buildReactionSearchHaystack(entry.keywordKey, entry.emoji),
}));

export function resolveStickyNoteReactionPickerEmojis(input: {
  category: StickyNoteReactionCategoryId;
  query: string;
  recentEmojis: readonly string[];
}): string[] {
  const needle = input.query.trim().toLowerCase();
  if (needle.length > 0) {
    return searchStickyNoteReactionEmojis(needle);
  }
  if (input.category === 'recent') {
    return [...input.recentEmojis];
  }
  return CATALOG[input.category].map((entry) => entry.emoji);
}

export function searchStickyNoteReactionEmojis(needle: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of SEARCH_HAYSTACK) {
    if (seen.has(entry.emoji) || !entry.haystack.includes(needle)) {
      continue;
    }
    seen.add(entry.emoji);
    result.push(entry.emoji);
  }
  return result;
}

function buildReactionSearchHaystack(keywordKey: string, emoji: string): string {
  const key = `comments.reactionKeywords.${keywordKey}`;
  return `${translate('en', key)} ${translate('ru', key)} ${emoji}`.toLowerCase();
}

function e(emoji: string, keywordKey: string): CatalogEntry {
  return { emoji, keywordKey };
}
