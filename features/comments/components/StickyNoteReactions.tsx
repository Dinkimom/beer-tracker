'use client';

/**
 * Бейджи реакций на нижнем крае sticky-note + тулбар/пикер как в Miro.
 */

import * as Popover from '@radix-ui/react-popover';
import { useCallback, useRef, useState } from 'react';

import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { StickyNoteReactionAddIcon } from '@/features/comments/components/StickyNoteReactionAddIcon';
import { StickyNoteReactionBackdrop } from '@/features/comments/components/StickyNoteReactionBackdrop';
import { StickyNoteReactionChips } from '@/features/comments/components/StickyNoteReactionChips';
import { StickyNoteReactionPicker } from '@/features/comments/components/StickyNoteReactionPicker';
import { StickyNoteReactionToolbar } from '@/features/comments/components/StickyNoteReactionToolbar';
import { useStickyNoteReactions } from '@/features/comments/StickyNoteReactionsProvider';
import { FLOATING_MENU_SHELL } from '@/features/context-menu/contextMenuClasses';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';

const TRIGGER_CLASS =
  'pointer-events-none flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md bg-white text-gray-900 opacity-0 shadow-[0_1px_6px_rgba(15,23,42,0.18)] transition-[opacity,transform] duration-150 ease-out scale-90 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 hover:bg-gray-50 focus-visible:pointer-events-auto focus-visible:scale-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 data-[state=open]:pointer-events-none data-[state=open]:opacity-0 data-[state=open]:scale-90 dark:bg-gray-800 dark:text-gray-100 dark:shadow-[0_1px_6px_rgba(0,0,0,0.4)] dark:hover:bg-gray-700';

const ALREADY_ADDED_KEYFRAMES: Keyframe[] = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.28)' },
  { transform: 'scale(1)' },
];

const PICKER_PANEL_CLASS = `${FLOATING_MENU_SHELL} overflow-hidden outline-none ${OVERLAY_FLOATING_ANIMATION}`;

const POPOVER_PANEL_CLASS = `flex flex-col items-start gap-2 ${OVERLAY_FLOATING_ANIMATION}`;

interface StickyNoteReactionsProps {
  hideAddTrigger?: boolean;
  noteId: string;
  readOnly?: boolean;
  /** Сброс hover-подсветки связей: portal/backdrop не даёт mouseleave с карточки. */
  onTaskHoverClear?: () => void;
}

export function StickyNoteReactions({
  hideAddTrigger = false,
  noteId,
  onTaskHoverClear,
  readOnly = false,
}: StickyNoteReactionsProps) {
  const { t } = useI18n();
  const { reactions, recentEmojis, toggle } = useStickyNoteReactions(noteId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const selectedEmojis = reactions.filter((reaction) => reaction.mine).map((reaction) => reaction.emoji);
  const isOpen = toolbarOpen && !hideAddTrigger && !readOnly;
  const overlay = useOverlayPresence(isOpen);

  const closeUi = useCallback(() => {
    setPickerOpen(false);
    setToolbarOpen(false);
    onTaskHoverClear?.();
  }, [onTaskHoverClear]);

  if (hideAddTrigger && (pickerOpen || toolbarOpen)) {
    setPickerOpen(false);
    setToolbarOpen(false);
  }
  if (readOnly && (pickerOpen || toolbarOpen)) {
    setPickerOpen(false);
    setToolbarOpen(false);
  }

  const handleOpenChange = (open: boolean) => {
    if (hideAddTrigger || readOnly || !open) {
      closeUi();
      return;
    }
    // Backdrop/portal перехватывает pointer без mouseleave с карточки — сбрасываем hover-кластер связей.
    onTaskHoverClear?.();
    setToolbarOpen(true);
  };

  const handleSelect = useCallback(
    (emoji: string) => {
      if (readOnly) {
        return;
      }
      if (selectedEmojis.includes(emoji)) {
        playAlreadyAddedMotion(findStickyNoteReactionChip(rowRef.current, emoji));
        return;
      }
      toggle(emoji);
      closeUi();
    },
    [closeUi, readOnly, selectedEmojis, toggle]
  );

  return (
    <Popover.Root modal open={overlay.mounted} onOpenChange={handleOpenChange}>
      <Popover.Anchor asChild>
        <div
          className="absolute bottom-0 left-1 flex translate-y-[28%] items-center gap-0.5 overflow-visible"
          style={{ zIndex: ZIndex.floatingControls }}
        >
          <div ref={rowRef} className="overflow-visible">
            <StickyNoteReactionChips
              reactions={reactions}
              readOnly={readOnly}
              onToggle={toggle}
            />
          </div>
          <div className={reactions.length > 0 ? 'relative h-6 w-0 shrink-0' : undefined}>
            <div className={reactions.length > 0 ? 'absolute left-0 top-0' : undefined}>
              <Popover.Trigger asChild>
                <button
                  aria-label={t('comments.addReactionAria')}
                  className={`${TRIGGER_CLASS} ${overlay.mounted || hideAddTrigger ? '!pointer-events-none !w-0 !overflow-hidden !p-0 !opacity-0 !scale-90' : ''}`}
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <StickyNoteReactionAddIcon className="h-3.5 w-3.5" />
                </button>
              </Popover.Trigger>
            </div>
          </div>
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <StickyNoteReactionBackdrop onClose={closeUi} />
      </Popover.Portal>
      <Popover.Portal>
        <Popover.Content
          align="end"
          avoidCollisions
          className="border-0 bg-transparent p-0 shadow-none outline-none"
          collisionPadding={12}
          data-sticky-note-reaction-toolbar=""
          side="right"
          sideOffset={4}
          style={{ zIndex: ZIndex.popupContent }}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div
            className={POPOVER_PANEL_CLASS}
            data-state={overlay.state}
            onAnimationEnd={overlay.onAnimationEnd}
          >
            {pickerOpen ? (
              <div
                aria-label={t('comments.reactionPickerAria')}
                className={PICKER_PANEL_CLASS}
                data-sticky-note-reaction-picker=""
                role="dialog"
              >
                <StickyNoteReactionPicker
                  recentEmojis={recentEmojis}
                  selectedEmojis={selectedEmojis}
                  onSelect={handleSelect}
                />
              </div>
            ) : null}
            <StickyNoteReactionToolbar
              selectedEmojis={selectedEmojis}
              onOpenPicker={() => setPickerOpen((open) => !open)}
              onSelect={handleSelect}
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function playAlreadyAddedMotion(target: HTMLElement | null): void {
  if (target == null) {
    return;
  }
  for (const animation of target.getAnimations()) {
    animation.cancel();
  }
  target.animate(ALREADY_ADDED_KEYFRAMES, { duration: 260, easing: 'ease-out' });
}

function findStickyNoteReactionChip(root: HTMLElement | null, emoji: string): HTMLElement | null {
  if (root == null) {
    return null;
  }
  const chips = root.querySelectorAll('[data-sticky-note-reaction-chip]');
  for (const chip of chips) {
    if (chip instanceof HTMLElement && chip.getAttribute('data-sticky-note-reaction-chip') === emoji) {
      return chip;
    }
  }
  return null;
}
