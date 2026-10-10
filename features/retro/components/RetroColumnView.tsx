'use client';

import type { RetroColumn, RetroVisibleCard } from '@/lib/retro/retroBoard';

import { useDroppable } from '@dnd-kit/core';

import { useI18n } from '@/contexts/LanguageContext';

import { RetroCardView } from './RetroCardView';
import { RetroColumnComposer } from './RetroColumnComposer';
import { RetroColumnHeader } from './RetroColumnHeader';
import { retroColumnDragId, retroColumnTitle, retroListClass, retroListDropClass } from './retroUi';

interface RetroColumnViewProps {
  cards: RetroVisibleCard[];
  column: RetroColumn;
  isFirst: boolean;
  isLast: boolean;
  onAddComment: (ownerSprintId: number, cardId: string, text: string, authorName: string) => void;
  onAddNote: (columnId: string, text: string) => void;
  onDelete: (columnId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onDeleteComment: (ownerSprintId: number, cardId: string, commentId: string) => void;
  onMove: (columnId: string, direction: -1 | 1) => void;
  onRename: (columnId: string, title: string) => void;
  onToggleReaction: (ownerSprintId: number, cardId: string, emoji: string) => void;
  onUpdateCardText: (ownerSprintId: number, cardId: string, text: string) => void;
}

export function RetroColumnView({
  cards,
  column,
  isFirst,
  isLast,
  onAddComment,
  onAddNote,
  onDelete,
  onDeleteCard,
  onDeleteComment,
  onMove,
  onRename,
  onToggleReaction,
  onUpdateCardText,
}: RetroColumnViewProps) {
  const { t } = useI18n();
  const title = retroColumnTitle(column, t);
  const { isOver, setNodeRef } = useDroppable({
    id: retroColumnDragId(column.id),
    data: { columnId: column.id, type: 'column' },
  });

  return (
    <section aria-label={title} className={isOver ? retroListDropClass : retroListClass}>
      <RetroColumnHeader
        cardCount={cards.length}
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
        {cards.map((card) => (
          <RetroCardView
            key={`${card.ownerSprintId}-${card.id}`}
            card={card}
            onAddComment={onAddComment}
            onDelete={onDeleteCard}
            onDeleteComment={onDeleteComment}
            onToggleReaction={onToggleReaction}
            onUpdateText={onUpdateCardText}
          />
        ))}
      </div>
      <RetroColumnComposer onAddNote={(text) => onAddNote(column.id, text)} />
    </section>
  );
}
