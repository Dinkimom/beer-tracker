'use client';

import type { RetroCommentAuthor, RetroReactionActor, RetroVisibleCard } from '@/lib/retro/retroBoard';

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
  enter?: boolean;
  onAddComment: (ownerSprintId: number, cardId: string, text: string, author: RetroCommentAuthor) => void;
  onDelete: (cardId: string) => void;
  onDeleteComment: (ownerSprintId: number, cardId: string, commentId: string) => void;
  onEnterEnd?: () => void;
  onToggleReaction: (
    ownerSprintId: number,
    cardId: string,
    emoji: string,
    actor: RetroReactionActor
  ) => void;
  onUpdateText: (ownerSprintId: number, cardId: string, text: string) => void;
}

export function RetroCardView({
  card,
  enter = false,
  onAddComment,
  onDelete,
  onDeleteComment,
  onEnterEnd,
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
      className={[cardDragClass(isDragging, card.carried), enter ? 'retro-card-enter' : '']
        .filter(Boolean)
        .join(' ')}
      {...listeners}
      {...attributes}
      onAnimationEnd={(event) => {
        if (!enter || event.target !== event.currentTarget) return;
        if (event.animationName !== 'retro-card-enter') return;
        onEnterEnd?.();
      }}
    >
      {body}
    </div>
  );
}
