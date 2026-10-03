'use client';

import type { RetroVisibleCard } from '@/lib/retro/retroBoard';

import { useDraggable } from '@dnd-kit/core';

import { RetroNoteCard } from './RetroNoteCard';
import { RetroPhotoCard } from './RetroPhotoCard';
import { retroCardDragId } from './retroUi';

function cardDragClass(isDragging: boolean, carried: boolean): string | undefined {
  if (isDragging) return 'cursor-grabbing opacity-40';
  if (carried) return undefined;
  return 'cursor-grab';
}

interface RetroCardViewProps {
  card: RetroVisibleCard;
  onAddComment: (ownerSprintId: number, cardId: string, text: string, authorName: string) => void;
  onDelete: (cardId: string) => void;
  onDeleteComment: (ownerSprintId: number, cardId: string, commentId: string) => void;
  onToggleReaction: (ownerSprintId: number, cardId: string, emoji: string) => void;
  onUpdateText: (ownerSprintId: number, cardId: string, text: string) => void;
}

export function RetroCardView({
  card,
  onAddComment,
  onDelete,
  onDeleteComment,
  onToggleReaction,
  onUpdateText,
}: RetroCardViewProps) {
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: retroCardDragId(card.ownerSprintId, card.id),
    data: {
      cardId: card.id,
      columnId: card.columnId,
      type: 'card',
    },
    disabled: card.carried,
  });

  const body = card.kind === 'image'
    ? (
      <RetroPhotoCard
        card={card}
        onAddComment={onAddComment}
        onDelete={onDelete}
        onDeleteComment={onDeleteComment}
      />
    )
    : (
      <RetroNoteCard
        card={card}
        pinReactions={isDragging}
        onAddComment={onAddComment}
        onDelete={onDelete}
        onDeleteComment={onDeleteComment}
        onToggleReaction={onToggleReaction}
        onUpdateText={onUpdateText}
      />
    );

  return (
    <div
      ref={setNodeRef}
      className={cardDragClass(isDragging, card.carried)}
      {...listeners}
      {...attributes}
    >
      {body}
    </div>
  );
}
