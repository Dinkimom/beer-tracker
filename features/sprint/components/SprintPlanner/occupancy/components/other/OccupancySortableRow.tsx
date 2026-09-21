'use client';

import type { ReactNode } from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface OccupancySortableRowProps {
  className?: string;
  id: string;
  isSortable: boolean;
  style?: React.CSSProperties;
  children: (dragHandle: {
    attributes: object;
    listeners: object | undefined;
  } | null) => ReactNode;
}

export function OccupancySortableRow({
  id,
  isSortable,
  className,
  style: styleProp,
  children,
}: OccupancySortableRowProps) {
  const sortable = useSortable({
    id,
    disabled: !isSortable,
    /** Без анимаций перестановки: иначе строка «плывёт» при смене контента/высоты (планирование фазы, пропадание предупреждения) */
    animateLayoutChanges: () => false,
    transition: null,
  });

  if (!isSortable) {
    return (
      <tr
        className={className}
        style={{ ...styleProp, transition: styleProp?.transition ?? 'none' }}
      >
        {children(null)}
      </tr>
    );
  }

  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = sortable;
  const style = {
    ...styleProp,
    transform: CSS.Transform.toString(transform),
    transition: transition ?? 'none',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} className={className} style={style}>
      {children({ attributes, listeners })}
    </tr>
  );
}
