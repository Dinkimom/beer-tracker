'use client';

import type { RetroSprintOrderItem, RetroVisibleCard } from '@/lib/retro/retroBoard';
import type { DragEndEvent } from '@dnd-kit/core';

import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/Button';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { useI18n } from '@/contexts/LanguageContext';
import { useRetroBoard } from '@/features/retro/hooks/useRetroBoard';
import { cardsForRetroColumn } from '@/lib/retro/retroBoard';

import { RetroCardActionsContext } from '../RetroCardActionsContext';

import { applyRetroBoardHorizontalWheel } from './retroBoardHorizontalWheel';
import { RetroColumnView } from './RetroColumnView';
import { RetroNoteCard } from './RetroNoteCard';
import { RetroPhotoCard } from './RetroPhotoCard';

interface RetroBoardViewProps {
  organizationId: string | null;
  sprintId: number;
  sprints: readonly RetroSprintOrderItem[];
}

function dropColumnId(over: DragEndEvent['over']): string | null {
  const data = over?.data.current;
  if (!data || typeof data !== 'object') return null;
  const columnId = 'columnId' in data ? data.columnId : null;
  return typeof columnId === 'string' ? columnId : null;
}

function dragCardWidth(active: DragEndEvent['active']): number | null {
  const width = active.rect.current.initial?.width;
  return typeof width === 'number' && width > 0 ? width : null;
}


function dragPreview(card: RetroVisibleCard) {
  if (card.kind === 'image') {
    return <RetroPhotoCard card={card} />;
  }
  // Превью перетаскивания — вне контекста действий: карточка только для чтения.
  return <RetroNoteCard card={card} pinReactions />;
}

function dragCardId(active: DragEndEvent['active']): string | null {
  const data = active.data.current;
  if (!data || typeof data !== 'object' || !('cardId' in data)) return null;
  return typeof data.cardId === 'string' ? data.cardId : null;
}

export function RetroBoardView({ organizationId, sprintId, sprints }: RetroBoardViewProps) {
  const { t } = useI18n();
  const boardApi = useRetroBoard(sprintId, sprints, organizationId);
  const [addingColumn, setAddingColumn] = useState(false);
  const [columnDraft, setColumnDraft] = useState('');
  const [draggedCard, setDraggedCard] = useState<RetroVisibleCard | null>(null);
  const [draggedWidth, setDraggedWidth] = useState<number | null>(null);
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    const board = boardScrollRef.current;
    if (!board) return undefined;
    const onWheel = (event: WheelEvent) => {
      applyRetroBoardHorizontalWheel(board, event);
    };
    board.addEventListener('wheel', onWheel, { passive: false });
    return () => board.removeEventListener('wheel', onWheel);
  }, [boardApi.isReady]);

  if (!boardApi.isReady) {
    return (
      <div
        aria-label={t('retro.boardAria')}
        className="min-h-0 min-w-0 flex-1"
        role="region"
      />
    );
  }

  const lastIndex = boardApi.board.columns.length - 1;
  const columns = boardApi.board.columns.map((column) => ({
    column,
    cards: cardsForRetroColumn(boardApi.store, sprintId, column, boardApi.previousSprintId),
  }));

  const submitColumn = (event: FormEvent) => {
    event.preventDefault();
    const title = columnDraft.trim();
    if (!title) return;
    boardApi.addColumn(title);
    setColumnDraft('');
    setAddingColumn(false);
  };

  const finishDrag = (event: DragEndEvent) => {
    const cardId = dragCardId(event.active);
    const columnId = dropColumnId(event.over);
    setDraggedCard(null);
    setDraggedWidth(null);
    if (!cardId || !columnId) return;
    boardApi.moveCard(cardId, columnId);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragCancel={() => {
        setDraggedCard(null);
        setDraggedWidth(null);
      }}
      onDragEnd={finishDrag}
      onDragStart={(event) => {
        const cardId = dragCardId(event.active);
        const card = columns.flatMap((entry) => entry.cards).find((item) => item.id === cardId) ?? null;
        setDraggedCard(card);
        setDraggedWidth(dragCardWidth(event.active));
      }}
    >
    <div
      ref={boardScrollRef}
      aria-label={t('retro.boardAria')}
      className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden bg-white dark:bg-transparent"
      role="region"
      style={{ paddingTop: 'var(--retro-controls-h, 0px)' }}
    >
      {/* w-max: иначе flex-ребёнок сжимается по ширине и overflow-x не появляется */}
      <div className="flex h-full w-max min-w-full items-stretch gap-3 px-3 pb-3">
        <RetroCardActionsContext.Provider value={boardApi.cardActions}>
        {columns.map(({ cards, column }, index) => (
          <RetroColumnView
            key={column.id}
            cards={cards}
            column={column}
            isFirst={index === 0}
            isLast={index === lastIndex}
            sprintId={sprintId}
            onAddNote={boardApi.addNote}
            onDelete={boardApi.removeColumn}
            onMove={boardApi.moveColumn}
            onRename={boardApi.renameColumn}
          />
        ))}
        </RetroCardActionsContext.Provider>
        <div className="w-[280px] shrink-0 self-start pt-1">
        {addingColumn ? (
          <form
            className="kanban-column-glass flex flex-col gap-2 rounded-xl border border-gray-200 p-2 dark:border-white/10"
            onSubmit={submitColumn}
          >
            <Input
              aria-label={t('retro.columnNamePlaceholder')}
              autoFocus
              placeholder={t('retro.columnNamePlaceholder')}
              size="sm"
              value={columnDraft}
              onChange={(event) => setColumnDraft(event.target.value)}
            />
            <div className="flex items-center gap-1">
              <Button disabled={!columnDraft.trim()} size="sm" type="submit" variant="primary">
                {t('retro.addListSubmit')}
              </Button>
              <HeaderIconButton
                aria-label={t('retro.cancel')}
                onCanvas
                onClick={() => {
                  setAddingColumn(false);
                  setColumnDraft('');
                }}
              >
                <Icon className="h-4 w-4" name="x" />
              </HeaderIconButton>
            </div>
          </form>
        ) : (
          <button
            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-black/5 active:scale-[0.98] active:bg-black/10 dark:text-gray-300 dark:hover:bg-white/10 dark:active:bg-white/15"
            type="button"
            onClick={() => setAddingColumn(true)}
          >
            <Icon className="h-4 w-4" name="plus" />
            {t('retro.addList')}
          </button>
        )}
        </div>
      </div>
    </div>
    <DragOverlay>
      {draggedCard ? (
        <div className="pointer-events-none cursor-grabbing" style={draggedWidth ? { width: draggedWidth } : undefined}>
          {dragPreview(draggedCard)}
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  );
}
