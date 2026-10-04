export interface BacklogSelectionAnchor {
  scopeId: string;
  taskId: string;
}

export function toggleBacklogTaskSelection(selected: ReadonlySet<string>, taskId: string): Set<string> {
  const next = new Set(selected);
  if (next.has(taskId)) next.delete(taskId);
  else next.add(taskId);
  return next;
}

export function addBacklogTaskRange(
  selected: ReadonlySet<string>,
  orderedIds: readonly string[],
  anchorId: string,
  targetId: string
): Set<string> | null {
  const start = orderedIds.indexOf(anchorId);
  const end = orderedIds.indexOf(targetId);
  if (start < 0 || end < 0) return null;
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  const next = new Set(selected);
  for (let index = from; index <= to; index += 1) {
    const taskId = orderedIds[index];
    if (taskId != null) next.add(taskId);
  }
  return next;
}

export function selectAllBacklogTaskIds(
  selected: ReadonlySet<string>,
  groups: Iterable<readonly string[]>
): Set<string> {
  const next = new Set(selected);
  for (const group of groups) {
    for (const taskId of group) next.add(taskId);
  }
  return next;
}

export function withoutBacklogTaskIds(selected: ReadonlySet<string>, taskIds: readonly string[]): Set<string> {
  if (taskIds.length === 0) return new Set(selected);
  const next = new Set(selected);
  for (const taskId of taskIds) next.delete(taskId);
  return next;
}

/** Обычный клик переключает задачу. Shift добавляет диапазон от якоря и якорь не сдвигает. */
export function applyBacklogSelectionToggle(input: {
  anchor: BacklogSelectionAnchor | null;
  orderedIds: readonly string[];
  scopeId: string;
  selected: ReadonlySet<string>;
  shiftKey: boolean;
  taskId: string;
}): { anchor: BacklogSelectionAnchor | null; selected: Set<string> } {
  if (input.shiftKey && input.anchor?.scopeId === input.scopeId) {
    const ranged = addBacklogTaskRange(input.selected, input.orderedIds, input.anchor.taskId, input.taskId);
    if (ranged) return { anchor: input.anchor, selected: ranged };
  }
  return {
    anchor: { scopeId: input.scopeId, taskId: input.taskId },
    selected: toggleBacklogTaskSelection(input.selected, input.taskId),
  };
}
