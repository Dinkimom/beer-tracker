'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { useI18n } from '@/contexts/LanguageContext';
import { getStickyNoteSwatchStyle } from '@/features/comments/utils/stickyNotePalette';
import { FLOATING_MENU_SHELL } from '@/features/context-menu/contextMenuClasses';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import {
  STICKY_NOTE_COLOR_LABEL_KEYS,
  STICKY_NOTE_COLORS,
} from '@/lib/comments/stickyNoteColor';

interface TaskBarDraftNoteColorDropdownProps {
  value: StickyNoteColor;
  onChange: (color: StickyNoteColor) => void;
}

export function TaskBarDraftNoteColorDropdown({
  value,
  onChange,
}: TaskBarDraftNoteColorDropdownProps) {
  const { t } = useI18n();
  const isDark = useDocumentDarkClass();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const colorLabel = t(STICKY_NOTE_COLOR_LABEL_KEYS[value]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t('comments.colorLabel')}
        className="!h-6 !min-h-0 !gap-1 !px-2 !py-0 !text-[11px] shadow-sm"
        title={colorLabel}
        type="button"
        variant="outline"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((wasOpen) => !wasOpen);
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span
          aria-hidden
          className="h-3 w-3 rounded-full border border-black/15 shadow-sm dark:border-white/20"
          style={getStickyNoteSwatchStyle(value, isDark)}
        />
        <Icon className={`!h-3 !w-3 ${open ? 'rotate-180' : ''}`} name="chevron-down" />
      </Button>
      {open ? (
        <div
          aria-label={t('sprintPlanner.swimlane.placementToolbar.noteColorPopup')}
          className={`absolute left-0 top-full mt-1 flex items-center gap-0.5 px-1.5 py-1.5 ${FLOATING_MENU_SHELL} ${OVERLAY_PANEL_ENTER}`}
          role="radiogroup"
        >
          {STICKY_NOTE_COLORS.map((color) => {
            const selected = color === value;
            const label = t(STICKY_NOTE_COLOR_LABEL_KEYS[color]);
            return (
              <button
                key={color}
                aria-checked={selected}
                aria-label={label}
                className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                  selected
                    ? 'bg-gray-200 dark:bg-gray-700'
                    : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/80'
                }`}
                role="radio"
                title={label}
                type="button"
                onClick={() => {
                  onChange(color);
                  setOpen(false);
                }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <span
                  aria-hidden
                  className="h-4 w-4 rounded-full border border-black/15 shadow-sm dark:border-white/20"
                  style={getStickyNoteSwatchStyle(color, isDark)}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
