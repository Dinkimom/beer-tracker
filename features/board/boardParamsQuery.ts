/** `columns` сбрасывает залипший в localStorage ответ без колонок (`['board', id]`). */
export function boardParamsQueryKey(boardId: number) {
  return ['board', 'columns', boardId] as const;
}
