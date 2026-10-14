/**
 * Ширина колонки фич, если своего ключа ещё нет: копируем колонку исполнителей.
 * Дальше значения живут отдельно.
 */
export function resolveFeatureColumnWidthDefault(
  storedFeatureWidth: number | null,
  storedAssigneeWidth: number
): number {
  if (storedFeatureWidth != null && Number.isFinite(storedFeatureWidth)) {
    return storedFeatureWidth;
  }
  return storedAssigneeWidth;
}
