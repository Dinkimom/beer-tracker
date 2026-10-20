/**
 * Старт карточки на таймлайне спринта: не левее 0 и так, чтобы
 * start + duration не вылезал за последнюю ячейку.
 */
export function clampSwimlaneStartCell(
  startCell: number,
  durationParts: number,
  totalCells: number
): number {
  if (totalCells <= 0) {
    return 0;
  }
  const duration = Number.isFinite(durationParts)
    ? Math.max(1, Math.round(durationParts))
    : 1;
  const maxStart = Math.max(0, totalCells - duration);
  if (!Number.isFinite(startCell)) {
    return 0;
  }
  return Math.max(0, Math.min(maxStart, Math.floor(startCell)));
}

export function swimlaneCellFromStartCell(startCell: number, partsPerDay: number): {
  day: number;
  part: number;
} {
  const safeParts = Math.max(1, partsPerDay);
  return {
    day: Math.floor(startCell / safeParts),
    part: startCell % safeParts,
  };
}
