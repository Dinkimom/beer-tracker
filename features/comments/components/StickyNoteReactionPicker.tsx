'use client';

import type { StickyNoteReactionCategoryId } from '@/lib/comments/stickyNoteReactionCatalog';

import { useState } from 'react';

import { SearchInput } from '@/components/SearchInput';
import { useI18n } from '@/contexts/LanguageContext';
import { STICKY_NOTE_REACTION_EMOJI_CLASS } from '@/lib/comments/stickyNoteReaction';
import {
  resolveStickyNoteReactionPickerEmojis,
  STICKY_NOTE_REACTION_CATEGORY_ICON,
  STICKY_NOTE_REACTION_CATEGORY_IDS,
  STICKY_NOTE_REACTION_CATEGORY_TITLE_KEY,
} from '@/lib/comments/stickyNoteReactionCatalog';

const CATEGORY_BUTTON_CLASS =
  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:hover:bg-gray-700';

const EMOJI_BUTTON_CLASS =
  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:hover:bg-gray-700';

interface StickyNoteReactionPickerProps {
  recentEmojis: readonly string[];
  selectedEmojis: readonly string[];
  onSelect: (emoji: string) => void;
}

export function StickyNoteReactionPicker({
  recentEmojis,
  selectedEmojis,
  onSelect,
}: StickyNoteReactionPickerProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<StickyNoteReactionCategoryId>('people');
  const selected = new Set(selectedEmojis);
  const emojis = resolveStickyNoteReactionPickerEmojis({
    category,
    query,
    recentEmojis,
  });
  const titleKey = query.trim()
    ? 'comments.reactionSearchResults'
    : STICKY_NOTE_REACTION_CATEGORY_TITLE_KEY[category];
  const emptyKey = resolveEmptyKey(category, query, emojis.length);

  return (
    <div className="flex w-80 flex-col gap-2 p-2">
      <SearchInput autoFocus size="sm" value={query} onChange={setQuery} />
      <div className="flex items-center justify-between gap-0.5">
        {STICKY_NOTE_REACTION_CATEGORY_IDS.map((id) => {
          const active = query.trim().length === 0 && id === category;
          return (
            <button
              key={id}
              aria-label={t(STICKY_NOTE_REACTION_CATEGORY_TITLE_KEY[id])}
              aria-pressed={active}
              className={`${CATEGORY_BUTTON_CLASS} ${active ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
              type="button"
              onClick={() => {
                setCategory(id);
                setQuery('');
              }}
            >
              <span aria-hidden className={STICKY_NOTE_REACTION_EMOJI_CLASS}>
                {STICKY_NOTE_REACTION_CATEGORY_ICON[id]}
              </span>
            </button>
          );
        })}
      </div>
      <div className="px-1 text-xs font-medium text-gray-600 dark:text-gray-300">{t(titleKey)}</div>
      {emptyKey != null ? (
        <div className="px-1 py-6 text-center text-sm text-gray-500 dark:text-gray-400">{t(emptyKey)}</div>
      ) : (
        <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto">
          {emojis.map((emoji) => {
            const mine = selected.has(emoji);
            return (
              <button
                key={emoji}
                aria-label={t('comments.reactWithAria', { emoji })}
                aria-pressed={mine}
                className={EMOJI_BUTTON_CLASS}
                type="button"
                onClick={() => onSelect(emoji)}
              >
                <span aria-hidden className={STICKY_NOTE_REACTION_EMOJI_CLASS}>
                  {emoji}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function resolveEmptyKey(
  category: StickyNoteReactionCategoryId,
  query: string,
  emojiCount: number
): string | null {
  if (emojiCount > 0) {
    return null;
  }
  if (query.trim().length > 0) {
    return 'comments.reactionSearchEmpty';
  }
  if (category === 'recent') {
    return 'comments.reactionRecentEmpty';
  }
  return 'comments.reactionSearchEmpty';
}
