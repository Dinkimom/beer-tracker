'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { useI18n } from '@/contexts/LanguageContext';
import { StickyNoteColorSwatch } from '@/features/comments/components/StickyNoteColorSwatch';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import { STICKY_NOTE_COLOR_LABEL_KEYS } from '@/lib/comments/stickyNoteColor';

import { StickyNoteColorSwatches } from './StickyNoteColorSwatches';

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
        <StickyNoteColorSwatch color={value} isDark={isDark} size={12} />
        <Icon className={`!h-3 !w-3 ${open ? 'rotate-180' : ''}`} name="chevron-down" />
      </Button>
      {open ? (
        <StickyNoteColorSwatches
          className={`absolute left-0 top-full mt-1 ${OVERLAY_PANEL_ENTER}`}
          value={value}
          onChange={(color) => {
            onChange(color);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
