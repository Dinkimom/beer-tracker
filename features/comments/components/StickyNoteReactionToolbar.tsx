'use client';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  STICKY_NOTE_QUICK_REACTION_EMOJIS,
  STICKY_NOTE_REACTION_EMOJI_CLASS,
} from '@/lib/comments/stickyNoteReaction';

const TOOLBAR_SHELL_CLASS =
  'pointer-events-auto flex h-8 items-center gap-0.5 rounded-lg bg-white px-1 shadow-[0_4px_16px_rgba(15,23,42,0.18)] dark:bg-gray-800 dark:shadow-[0_4px_16px_rgba(0,0,0,0.45)]';

const TOOLBAR_BUTTON_CLASS =
  'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:text-gray-200 dark:hover:bg-gray-700';

interface StickyNoteReactionToolbarProps {
  selectedEmojis: readonly string[];
  onOpenPicker: () => void;
  onSelect: (emoji: string) => void;
}

export function StickyNoteReactionToolbar({
  selectedEmojis,
  onOpenPicker,
  onSelect,
}: StickyNoteReactionToolbarProps) {
  const { t } = useI18n();
  const selected = new Set(selectedEmojis);

  return (
    <div
      className={TOOLBAR_SHELL_CLASS}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {STICKY_NOTE_QUICK_REACTION_EMOJIS.map((emoji) => {
        const mine = selected.has(emoji);
        return (
          <button
            key={emoji}
            aria-label={t('comments.reactWithAria', { emoji })}
            aria-pressed={mine}
            className={TOOLBAR_BUTTON_CLASS}
            type="button"
            onClick={() => onSelect(emoji)}
          >
            <span aria-hidden className={`${STICKY_NOTE_REACTION_EMOJI_CLASS} text-[15px]`}>
              {emoji}
            </span>
          </button>
        );
      })}
      <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-gray-200 dark:bg-gray-600" />
      <button
        aria-label={t('comments.reactionMoreAria')}
        className={TOOLBAR_BUTTON_CLASS}
        type="button"
        onClick={onOpenPicker}
      >
        <Icon className="h-3.5 w-3.5" name="chevron-down" size="sm" />
      </button>
    </div>
  );
}
