function shouldInsertBeforeRect(rect: DOMRect, pointerY: number): boolean {
  const midY = rect.top + rect.height / 2;
  return pointerY < midY;
}

function findDropInsertIndexInList(
  orderedTaskIds: string[],
  getRect: (taskId: string) => DOMRect | undefined,
  pointerY: number,
): number | null {
  for (let i = 0; i < orderedTaskIds.length; i++) {
    const rect = getRect(orderedTaskIds[i]!);
    if (rect && shouldInsertBeforeRect(rect, pointerY)) {
      return i;
    }
  }
  return null;
}

/**
 * Индекс вставки в плоский список карточек сайдбара по clientY курсора.
 */
export function computeSidebarDropInsertIndex(
  orderedTaskIds: string[],
  getRect: (taskId: string) => DOMRect | undefined,
  pointerY: number
): number {
  if (orderedTaskIds.length === 0) {
    return 0;
  }

  const insertIndex = findDropInsertIndexInList(orderedTaskIds, getRect, pointerY);
  if (insertIndex != null) {
    return insertIndex;
  }

  return orderedTaskIds.length;
}
