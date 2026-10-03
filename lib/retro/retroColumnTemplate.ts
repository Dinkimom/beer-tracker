import {
  RETRO_COLUMN_TITLE_MAX_LENGTH,
  type RetroColumn,
} from './retroBoardShared';

export function renameRetroTemplateColumn(
  columns: readonly RetroColumn[],
  columnId: string,
  title: string
): RetroColumn[] {
  const trimmed = title.trim().slice(0, RETRO_COLUMN_TITLE_MAX_LENGTH);
  return columns.map((column) => (column.id === columnId ? { ...column, title: trimmed } : column));
}

export function removeRetroTemplateColumn(columns: RetroColumn[], columnId: string): RetroColumn[] {
  const target = columns.find((column) => column.id === columnId);
  if (!target || target.role === 'agreements') return columns;
  return columns.filter((column) => column.id !== columnId);
}

export function moveRetroTemplateColumn(
  columns: RetroColumn[],
  columnId: string,
  direction: -1 | 1
): RetroColumn[] {
  const index = columns.findIndex((column) => column.id === columnId);
  const nextIndex = index + direction;
  if (index <= 0 || nextIndex <= 0 || nextIndex >= columns.length) return columns;
  if (columns[index]?.role === 'agreements') return columns;
  const next = [...columns];
  const [moved] = next.splice(index, 1);
  if (!moved) return columns;
  next.splice(nextIndex, 0, moved);
  return next;
}

export function addRetroTemplateColumn(columns: readonly RetroColumn[], title: string): RetroColumn[] {
  const trimmed = title.trim().slice(0, RETRO_COLUMN_TITLE_MAX_LENGTH);
  if (!trimmed) return [...columns];
  return [
    ...columns,
    {
      id: `column-${crypto.randomUUID()}`,
      preset: null,
      role: null,
      title: trimmed,
    },
  ];
}
