export function confirmAutoAssignIfNeeded(input: {
  confirm: (
    message: string,
    options?: { title?: string; variant?: 'default' | 'destructive' }
  ) => Promise<boolean>;
  taskPositionsCount: number;
}): Promise<boolean> {
  if (input.taskPositionsCount === 0) return Promise.resolve(true);
  return input.confirm(
    'Автоматическая расстановка приведет к удалению всех текущих задач на swimlane и их повторной расстановке. Продолжить?',
    {
      title: 'Подтверждение автоматической расстановки',
      variant: 'default',
    }
  );
}

export async function saveAutoAssignBatch(input: {
  linksArray: Array<Record<string, unknown>>;
  positionsArray: Array<Record<string, unknown>>;
  selectedSprintId: number;
  saveTaskLinksBatch: (sprintId: number, links: Array<Record<string, unknown>>) => Promise<unknown>;
  saveTaskPositionsBatch: (
    sprintId: number,
    positions: Array<Record<string, unknown>>
  ) => Promise<unknown>;
}): Promise<void> {
  await Promise.all([
    input.positionsArray.length > 0
      ? input.saveTaskPositionsBatch(input.selectedSprintId, input.positionsArray)
      : Promise.resolve({ success: true, count: 0 }),
    input.linksArray.length > 0
      ? input.saveTaskLinksBatch(input.selectedSprintId, input.linksArray)
      : Promise.resolve({ success: true, count: 0 }),
  ]);
}
