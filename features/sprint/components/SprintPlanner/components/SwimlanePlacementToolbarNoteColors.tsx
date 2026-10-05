'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';

import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { getStickyNoteSwatchStyle } from '@/features/comments/utils/stickyNotePalette';
import { FLOATING_MENU_SHELL } from '@/features/context-menu/contextMenuClasses';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import {
  STICKY_NOTE_COLOR_LABEL_KEYS,
  STICKY_NOTE_COLORS,
} from '@/lib/comments/stickyNoteColor';

interface SwimlanePlacementToolbarNoteColorsProps {
  value: StickyNoteColor;
  onChange: (color: StickyNoteColor) => void;
}

export function SwimlanePlacementToolbarNoteColors({
  value,
  onChange,
}: SwimlanePlacementToolbarNoteColorsProps) {
  const { t } = useI18n();
  const isDark = useDocumentDarkClass();
  return (
    <div
      aria-label={t('sprintPlanner.swimlane.placementToolbar.noteColorPopup')}
      className={`absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 items-center gap-0.5 px-1.5 py-1.5 ${FLOATING_MENU_SHELL}`}
      role="radiogroup"
    >
      {STICKY_NOTE_COLORS.map((color) => {
        const selected = color === value;
        const label = t(STICKY_NOTE_COLOR_LABEL_KEYS[color]);
        return (
          <TextTooltip key={color} content={label}>
          <button
            aria-checked={selected}
            aria-label={label}
            className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
              selected
                ? 'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500'
                : 'bg-transparent hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-700/80 dark:active:bg-gray-600'
            }`}
            role="radio"
            type="button"
            onClick={() => onChange(color)}
            onMouseDown={(event) => event.preventDefault()}
          >
            <span
              aria-hidden
              className="h-4 w-4 rounded-full border border-black/15 shadow-sm dark:border-white/20"
              style={getStickyNoteSwatchStyle(color, isDark)}
            />
          </button>
          </TextTooltip>
        );
      })}
    </div>
  );
}
