/** Разделитель в id draggable: `taskId::segmentIndex` для нескольких карточек одной задачи. */
const SWIMLANE_TASK_DRAG_ID_SEP = '::';

/**
 * Маркер в `useDraggable({ data })` для карточки задачи на свимлейне.
 * Id может совпадать с префиксом `swimlane-…` (ключ трекера), поэтому DndContext
 * отличает такой drag от перетаскивания строки разработчика по `data.kind`.
 */
export const SWIMLANE_TASK_DRAG_DATA_KIND = 'swimlane-task' as const;

/** Явный маркер перетаскивания строки разработчика (если появится в UI). Не полагаться на префикс id — ключи задач могут начинаться с `swimlane-`. */
export const SWIMLANE_DEVELOPER_ROW_DRAG_KIND = 'developer-row' as const;

export function isActiveSwimlaneTaskDrag(active: {
  data?: { current?: unknown };
}): boolean {
  return (
    (active.data?.current as { kind?: string } | undefined)?.kind === SWIMLANE_TASK_DRAG_DATA_KIND
  );
}

export function isActiveDeveloperRowDrag(active: {
  data?: { current?: unknown };
}): boolean {
  return (
    (active.data?.current as { kind?: string } | undefined)?.kind === SWIMLANE_DEVELOPER_ROW_DRAG_KIND
  );
}

export function swimlaneTaskDraggableId(taskId: string, segmentIndex: number): string {
  return `${taskId}${SWIMLANE_TASK_DRAG_ID_SEP}${segmentIndex}`;
}

export function parseSwimlaneTaskDraggableId(id: string): {
  segmentIndex: number | null;
  taskId: string;
} {
  const idx = id.indexOf(SWIMLANE_TASK_DRAG_ID_SEP);
  if (idx === -1) {
    return { taskId: id, segmentIndex: null };
  }
  const taskId = id.slice(0, idx);
  const seg = Number(id.slice(idx + SWIMLANE_TASK_DRAG_ID_SEP.length));
  return {
    taskId,
    segmentIndex: Number.isFinite(seg) ? seg : null,
  };
}
