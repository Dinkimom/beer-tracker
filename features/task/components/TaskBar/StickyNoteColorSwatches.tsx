'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';

import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { StickyNoteColorSwatch } from '@/features/comments/components/StickyNoteColorSwatch';
import { FLOATING_MENU_SHELL } from '@/features/context-menu/contextMenuClasses';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import { STICKY_NOTE_COLOR_LABEL_KEYS, STICKY_NOTE_COLORS } from '@/lib/comments/stickyNoteColor';

interface StickyNoteColorSwatchesProps {
  className?: string;
  framed?: boolean;
  value: StickyNoteColor;
  onChange: (color: StickyNoteColor) => void;
}

const SWATCH_BUTTON_CLASS =
  'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40';

export function StickyNoteColorSwatches({
  className = '',
  framed = true,
  onChange,
  value,
}: StickyNoteColorSwatchesProps) {
  const { t } = useI18n();
  const isDark = useDocumentDarkClass();
  const frameClass = framed ? FLOATING_MENU_SHELL : '';
  return (
    <div
      aria-label={t('sprintPlanner.swimlane.placementToolbar.noteColorPopup')}
      className={`flex items-center gap-0.5 px-1.5 py-1.5 ${frameClass} ${className}`}
      role="radiogroup"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {STICKY_NOTE_COLORS.map((color) => {
        const selected = color === value;
        const label = t(STICKY_NOTE_COLOR_LABEL_KEYS[color]);
        const selectedClass = selected
          ? 'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500'
          : 'bg-transparent hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-700/80 dark:active:bg-gray-600';
        return (
          <TextTooltip key={color} content={label}>
            <button
              aria-checked={selected}
              aria-label={label}
              className={`${SWATCH_BUTTON_CLASS} ${selectedClass}`}
              role="radio"
              type="button"
              onClick={() => onChange(color)}
            >
              <StickyNoteColorSwatch color={color} isDark={isDark} />
            </button>
          </TextTooltip>
        );
      })}
    </div>
  );
}
