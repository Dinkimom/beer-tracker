import type { BoardListItem } from '@/lib/api/types';

/** Подпись в селекторе: название команды, иначе имя доски из Трекера. */
export function boardSelectorLabel(board: BoardListItem): string {
  const t = board.teamTitle?.trim();
  return t || board.name;
}
