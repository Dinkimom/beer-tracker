'use client';

import type { RetroColumn } from '@/lib/retro/retroBoard';

import * as Popover from '@radix-ui/react-popover';
import { useState } from 'react';

import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { useI18n } from '@/contexts/LanguageContext';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';

import { retroColumnTitle, retroIconButtonClass } from './retroUi';

interface RetroColumnHeaderProps {
  cardCount: number;
  column: RetroColumn;
  isFirst: boolean;
  isLast: boolean;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onRename: (title: string) => void;
}

export function RetroColumnHeader({
  cardCount,
  column,
  isFirst,
  isLast,
  onDelete,
  onMove,
  onRename,
}: RetroColumnHeaderProps) {
  const { t } = useI18n();
  const title = retroColumnTitle(column, t);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const overlay = useOverlayPresence(menuOpen);
  const canDelete = column.role !== 'agreements';

  const commitTitle = () => {
    const trimmed = draft.trim();
    const presetLabel = column.preset ? t(`retro.presets.${column.preset}`) : '';
    if (column.preset && (trimmed === '' || trimmed === presetLabel)) {
      onRename('');
    } else if (trimmed) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  return (
    <div className="relative flex items-start gap-1 border-b border-gray-200/90 px-2 pb-2 pt-2.5 dark:border-white/10">
      {editing ? (
        <input
          aria-label={t('retro.renameColumn')}
          autoFocus
          className="min-w-0 flex-1 rounded-md border border-blue-500 bg-white px-2 py-1 text-sm font-semibold text-gray-900 outline-none dark:bg-white/[0.08] dark:text-gray-100"
          value={draft}
          onBlur={commitTitle}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') {
              setDraft(title);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          className="min-w-0 flex-1 cursor-text whitespace-normal break-words rounded-md px-1 py-1 text-left text-sm font-semibold leading-snug text-gray-700 transition-all duration-200 hover:bg-black/5 active:scale-[0.98] active:bg-black/10 dark:text-gray-200 dark:hover:bg-white/10 dark:active:bg-white/15"
          type="button"
          onClick={() => {
            setDraft(title);
            setEditing(true);
            setMenuOpen(false);
          }}
        >
          {title}
        </button>
      )}
      <span
        aria-label={t('retro.cardCount', { count: String(cardCount) })}
        className="mt-1 inline-flex shrink-0 items-center rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-gray-600 shadow-sm dark:bg-white/[0.08] dark:text-gray-300 dark:shadow-none"
      >
        {cardCount}
      </span>
      <Popover.Root
        open={menuOpen}
        onOpenChange={(open) => {
          setMenuOpen(open);
          if (open) setConfirmDelete(false);
        }}
      >
        <Popover.Trigger aria-label={t('retro.listMenu')} className={retroIconButtonClass} type="button">
          <Icon className="h-4 w-4" name="dots-horizontal" />
        </Popover.Trigger>
        {overlay.mounted ? (
        <Popover.Portal forceMount>
          <Popover.Content
            align="end"
            className={`z-[80] w-max rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black/10 outline-none dark:bg-gray-800 dark:ring-white/10 ${OVERLAY_FLOATING_ANIMATION}`}
            data-state={overlay.state}
            forceMount
            sideOffset={4}
            onAnimationEnd={overlay.onAnimationEnd}
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            {menuItem(t('retro.renameColumn'), () => {
              setMenuOpen(false);
              setDraft(title);
              setEditing(true);
            })}
            {menuItem(t('retro.moveColumnLeft'), () => {
              setMenuOpen(false);
              onMove(-1);
            }, isFirst)}
            {menuItem(t('retro.moveColumnRight'), () => {
              setMenuOpen(false);
              onMove(1);
            }, isLast)}
            {canDelete && !confirmDelete
              ? menuItem(t('retro.deleteColumn'), () => setConfirmDelete(true), false, true)
              : null}
            {canDelete && confirmDelete
              ? menuItem(t('retro.deleteColumnConfirm'), () => {
                setMenuOpen(false);
                onDelete();
              }, false, true)
              : null}
          </Popover.Content>
        </Popover.Portal>
        ) : null}
      </Popover.Root>
    </div>
  );
}

function menuItem(label: string, onClick: () => void, disabled = false, danger = false) {
  const tone = danger
    ? 'text-red-600 hover:bg-red-50 active:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/40 dark:active:bg-red-950/70'
    : 'text-gray-800 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600';
  return (
    <button
      className={`block w-full cursor-pointer whitespace-nowrap px-3 py-1.5 text-left transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${tone}`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
