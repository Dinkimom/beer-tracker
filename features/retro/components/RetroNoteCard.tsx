'use client';

import type { RetroCommentAuthor, RetroVisibleCard } from '@/lib/retro/retroBoard';

import * as Popover from '@radix-ui/react-popover';
import { memo, useState } from 'react';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { StickyNoteReactionAddIcon } from '@/features/comments/components/StickyNoteReactionAddIcon';
import { StickyNoteReactionChips } from '@/features/comments/components/StickyNoteReactionChips';
import { StickyNoteReactionPicker } from '@/features/comments/components/StickyNoteReactionPicker';
import { StickyNoteReactionToolbar } from '@/features/comments/components/StickyNoteReactionToolbar';
import { StickyNoteTextContent } from '@/features/comments/components/StickyNoteTextContent';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  aggregateRetroReactions,
  myRetroReactionEmojis,
  uniqueRetroReactionEmojis,
  type RetroReactionActor,
} from '@/lib/retro/retroBoard';

import { RetroCardAuthorButton } from './RetroCardAuthorButton';
import { RetroCardComments } from './RetroCardComments';
import { retroCardSurfaceClass, retroIconButtonClass } from './retroUi';

const NOTE_TEXT_CLASS =
  'w-full whitespace-pre-wrap break-words rounded-md px-1.5 py-1 text-left text-sm leading-snug';

const NOTE_TEXT_HOVER_CLASS =
  'cursor-text transition-colors duration-200 hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/10 dark:active:bg-white/15';

const REACTION_ADD_CLASS =
  'pointer-events-none flex h-6 w-6 shrink-0 scale-90 cursor-pointer items-center justify-center rounded-md bg-white text-gray-900 opacity-0 shadow-[0_1px_6px_rgba(15,23,42,0.18)] transition-[opacity,transform,background-color] duration-150 ease-out group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 hover:bg-gray-50 active:bg-gray-100 focus-visible:pointer-events-auto focus-visible:scale-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 data-[state=open]:pointer-events-auto data-[state=open]:scale-100 data-[state=open]:opacity-100 dark:bg-gray-800 dark:text-gray-100 dark:shadow-[0_1px_6px_rgba(0,0,0,0.4)] dark:hover:bg-gray-700 dark:active:bg-gray-600';

interface RetroNoteCardProps {
  card: RetroVisibleCard;
  pinReactions?: boolean;
  onAddComment?: (ownerSprintId: number, cardId: string, text: string, author: RetroCommentAuthor) => void;
  onDelete: (cardId: string) => void;
  onDeleteComment?: (ownerSprintId: number, cardId: string, commentId: string) => void;
  onToggleReaction: (
    ownerSprintId: number,
    cardId: string,
    emoji: string,
    actor: RetroReactionActor
  ) => void;
  onUpdateText: (ownerSprintId: number, cardId: string, text: string) => void;
}

function reactionActor(user: {
  display: string;
  email: string;
  login: string;
  uid: number;
}): RetroReactionActor {
  const userName = user.display.trim() || user.login.trim() || user.email.trim();
  return { userId: String(user.uid), userName };
}

export const RetroNoteCard = memo(function RetroNoteCard({
  card,
  pinReactions = false,
  onAddComment,
  onDelete,
  onDeleteComment,
  onToggleReaction,
  onUpdateText,
}: RetroNoteCardProps) {
  const { t } = useI18n();
  const { data: user } = useCurrentUser();
  const actor = user ? reactionActor(user) : null;
  const currentUserId = actor?.userId ?? '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.text);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const reactionRowClass = 'mt-2 flex min-h-6 flex-wrap items-center gap-1';
  const reactionAddClass = pinReactions
    ? `${REACTION_ADD_CLASS} !pointer-events-auto !scale-100 !opacity-100`
    : REACTION_ADD_CLASS;
  const reactionChips = aggregateRetroReactions(card.reactions, currentUserId);
  const myEmojis = myRetroReactionEmojis(card.reactions, currentUserId);
  const recentEmojis = uniqueRetroReactionEmojis(card.reactions);

  const saveText = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === card.text) return;
    onUpdateText(card.ownerSprintId, card.id, trimmed);
  };

  const toggle = (emoji: string) => {
    if (!actor) return;
    onToggleReaction(card.ownerSprintId, card.id, emoji, actor);
  };

  const selectFromMenu = (emoji: string) => {
    toggle(emoji);
    setPickerOpen(false);
    setMenuOpen(false);
  };

  return (
    <Popover.Root
      open={menuOpen}
      onOpenChange={(open) => {
        setMenuOpen(open);
        if (!open) setPickerOpen(false);
      }}
    >
      <article className={retroCardSurfaceClass}>
        {card.carried ? (
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('retro.carriedBadge')}
          </p>
        ) : null}
        <div className="-mx-1.5 -my-1 flex items-start gap-1">
          {editing ? (
            <div className="grid min-w-0 flex-1 grid-cols-1">
              <div aria-hidden className={`invisible col-start-1 row-start-1 ${NOTE_TEXT_CLASS}`}>
                {draft || ' '}
              </div>
              <textarea
                aria-label={t('retro.editNote')}
                autoFocus
                className={`col-start-1 row-start-1 h-full min-h-0 resize-none overflow-hidden bg-transparent outline-none ${NOTE_TEXT_CLASS}`}
                rows={1}
                value={draft}
                onBlur={saveText}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setDraft(card.text);
                    setEditing(false);
                  }
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
                onPointerDown={(event) => event.stopPropagation()}
              />
            </div>
          ) : (
            <button
              className={`min-w-0 flex-1 ${NOTE_TEXT_HOVER_CLASS} ${NOTE_TEXT_CLASS}`}
              type="button"
              onClick={() => {
                setDraft(card.text);
                setEditing(true);
              }}
            >
              <StickyNoteTextContent isDragging={false} text={card.text} />
            </button>
          )}
          <button
            aria-label={t('retro.deleteCard')}
            className={`${retroIconButtonClass} opacity-0 group-hover:opacity-100`}
            type="button"
            onClick={() => onDelete(card.id)}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Icon className="h-3.5 w-3.5" name="x" />
          </button>
        </div>
        <div className={reactionRowClass}>
          {reactionChips.length > 0 ? (
            <StickyNoteReactionChips reactions={reactionChips} onToggle={toggle} />
          ) : null}
          <Popover.Trigger
            aria-label={t('comments.addReactionAria')}
            className={reactionAddClass}
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <StickyNoteReactionAddIcon className="h-3.5 w-3.5" />
          </Popover.Trigger>
          <div className="ml-auto flex items-center gap-0.5">
            {card.authorName ? (
              <RetroCardAuthorButton avatarUrl={card.authorAvatarUrl} name={card.authorName} />
            ) : null}
            {onAddComment && onDeleteComment ? (
              <RetroCardComments
                comments={card.comments}
                onAdd={(text, author) => onAddComment(card.ownerSprintId, card.id, text, author)}
                onDelete={(commentId) => onDeleteComment(card.ownerSprintId, card.id, commentId)}
              />
            ) : null}
          </div>
        </div>
        {card.kind === 'agreement' && !card.carried ? (
          <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{t('retro.carriesHint')}</p>
        ) : null}
      </article>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="z-[80] flex flex-col items-start gap-2 border-0 bg-transparent p-0 shadow-none outline-none"
          side="right"
          sideOffset={6}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          {pickerOpen ? (
            <div className="overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900">
              <StickyNoteReactionPicker
                recentEmojis={recentEmojis}
                selectedEmojis={myEmojis}
                onSelect={selectFromMenu}
              />
            </div>
          ) : null}
          <StickyNoteReactionToolbar
            selectedEmojis={myEmojis}
            onOpenPicker={() => setPickerOpen((open) => !open)}
            onSelect={selectFromMenu}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});
