'use client';

import type {
  RetroColumn,
  RetroCommentAuthor,
  RetroVisibleCard,
} from '@/lib/retro/retroBoard';

import { useDroppable } from '@dnd-kit/core';
import { useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { DEFAULT_STICKY_NOTE_COLOR } from '@/lib/comments/stickyNoteColor';
import { randomUuid } from '@/lib/randomUuid';

import { useRetroIdentity } from '../retroIdentity';

import { RetroCardView } from './RetroCardView';
import { RetroColumnComposer } from './RetroColumnComposer';
import { RetroColumnHeader } from './RetroColumnHeader';
import { retroColumnDragId, retroColumnTitle, retroListClass, retroListDropClass } from './retroUi';

interface RetroColumnViewProps {
  cards: RetroVisibleCard[];
  column: RetroColumn;
  isFirst: boolean;
  isLast: boolean;
  sprintId: number;
  onAddNote: (columnId: string, text: string, cardId: string) => void;
  onDelete: (columnId: string) => void;
  onMove: (columnId: string, direction: -1 | 1) => void;
  onRename: (columnId: string, title: string) => void;
}

export function RetroColumnView({
  cards,
  column,
  isFirst,
  isLast,
  sprintId,
  onAddNote,
  onDelete,
  onMove,
  onRename,
}: RetroColumnViewProps) {
  const { t } = useI18n();
  // Тот же автор, что у `addNote`: заглушка заметки до ответа выглядит как будущая заметка.
  const author = useRetroIdentity().author;
  const title = retroColumnTitle(column, t);
  const [pending, setPending] = useState<RetroVisibleCard | null>(null);
  const [enterId, setEnterId] = useState<string | null>(null);
  const pendingLanded = pending != null && cards.some((card) => card.id === pending.id);
  if (pendingLanded) setPending(null);
  const shownCards = pendingLanded || pending == null ? cards : placePendingCard(cards, pending);

  const { isOver, setNodeRef } = useDroppable({
    id: retroColumnDragId(column.id),
    data: { columnId: column.id, type: 'column' },
  });

  return (
    <section aria-label={title} className={isOver ? retroListDropClass : retroListClass}>
      <RetroColumnHeader
        cardCount={shownCards.length}
        column={column}
        isFirst={isFirst}
        isLast={isLast}
        onDelete={() => onDelete(column.id)}
        onMove={(direction) => onMove(column.id, direction)}
        onRename={(nextTitle) => onRename(column.id, nextTitle)}
      />
      <div
        ref={setNodeRef}
        className="flex min-h-8 flex-1 flex-col gap-2.5 overflow-x-hidden overflow-y-auto px-0.5 pt-1.5 pb-2.5"
        style={{ overscrollBehaviorX: 'auto' }}
      >
        {shownCards.map((card) => (
          <RetroCardView
            key={`${card.ownerSprintId}-${card.id}`}
            card={card}
            enter={card.id === enterId}
            onEnterEnd={() => setEnterId((current) => (current === card.id ? null : current))}
          />
        ))}
        <RetroColumnComposer
          onAddNote={(text) => {
            const card = pendingNote(column.id, sprintId, text, author);
            setPending(card);
            setEnterId(card.id);
            onAddNote(column.id, text, card.id);
          }}
        />
      </div>
    </section>
  );
}

function pendingNote(
  columnId: string,
  sprintId: number,
  text: string,
  author: RetroCommentAuthor
): RetroVisibleCard {
  return {
    carried: false,
    carriesToNext: false,
    color: DEFAULT_STICKY_NOTE_COLOR,
    columnId,
    comments: [],
    createdAt: new Date().toISOString(),
    id: `card-${randomUuid()}`,
    imageDataUrl: null,
    kind: 'note',
    originSprintId: null,
    ownerSprintId: sprintId,
    reactions: [],
    text,
    ...(author.name ? { authorName: author.name } : {}),
    ...(author.name && author.userId ? { authorId: author.userId } : {}),
    ...(author.name && author.avatarUrl ? { authorAvatarUrl: author.avatarUrl } : {}),
  };
}

function placePendingCard(cards: readonly RetroVisibleCard[], pending: RetroVisibleCard): RetroVisibleCard[] {
  return [...cards, pending].sort(compareVisibleCards);
}

function compareVisibleCards(a: RetroVisibleCard, b: RetroVisibleCard): number {
  if (a.createdAt === b.createdAt) return a.id < b.id ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : 1;
}
