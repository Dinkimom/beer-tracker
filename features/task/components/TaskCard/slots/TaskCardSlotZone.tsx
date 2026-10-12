'use client';

import type { ReactNode } from 'react';

import { useDroppable } from '@dnd-kit/core';
import { horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable';

interface TaskCardSlotZoneProps {
  alignEnd?: boolean;
  children: ReactNode;
  className?: string;
  dropId: string;
  emptyLabel: string;
  isEmpty: boolean;
  itemIds: readonly string[];
  label: string;
  suffix?: ReactNode;
  wrap?: boolean;
}

export function TaskCardSlotZone({
  alignEnd = false,
  children,
  className = '',
  dropId,
  emptyLabel,
  isEmpty,
  itemIds,
  label,
  suffix,
  wrap = true,
}: TaskCardSlotZoneProps) {
  const { isOver, over, setNodeRef } = useDroppable({ id: `zone:${dropId}` });
  const overId = over ? String(over.id) : '';
  const highlighted = isOver || itemIds.includes(overId);

  return (
    <div
      ref={setNodeRef}
      aria-label={label}
      className={`flex min-h-10 min-w-16 items-center gap-1.5 rounded-md px-1 py-1 transition-colors ${
        wrap ? 'flex-wrap' : 'flex-nowrap'
      } ${alignEnd ? 'justify-end' : ''} ${className} ${highlighted ? 'bg-blue-50 ring-1 ring-blue-300 dark:bg-blue-500/10 dark:ring-blue-400/40' : ''}`}
      role="group"
    >
      <SortableContext items={[...itemIds]} strategy={horizontalListSortingStrategy}>
        {children}
        {isEmpty ? <span className="text-[11px] text-gray-400 dark:text-gray-500">{emptyLabel}</span> : null}
      </SortableContext>
      {suffix}
    </div>
  );
}
