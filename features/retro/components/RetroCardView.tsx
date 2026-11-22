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
  enter?: boolean;
  onEnterEnd?: () => void;
}

export function RetroCardView({
  card,
  enter = false,
  onEnterEnd,
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
      <RetroPhotoCard card={card} />
    )
    : (
      <RetroNoteCard card={card} pinReactions={isDragging} />
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
