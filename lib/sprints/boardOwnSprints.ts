interface SprintWithBoard {
  board?: { id?: string | null } | null;
}

/**
 * Только спринты самой доски. Jira отдаёт в списке доски и спринты соседних досок, где есть
 * её задачи; у таких `board.id` — доска-владелец (`originBoardId`). Спринт без доски оставляем.
 */
export function boardOwnSprints<T extends SprintWithBoard>(sprints: readonly T[], boardId: number): T[] {
  const own = String(boardId);
  return sprints.filter((sprint) => !sprint.board?.id || sprint.board.id === own);
}
