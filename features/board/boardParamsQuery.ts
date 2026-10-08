export function boardParamsQueryKey(boardId: number) {
  return ['board', boardId] as const;
}
