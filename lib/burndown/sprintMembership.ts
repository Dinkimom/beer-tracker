/**
 * Сопоставление спринта в полях Tracker (issue_data, changelog): одна логика для реплея и для «сейчас в спринте».
 */

import { issueFieldsFromStoredSnapshot } from '@/lib/issueTrackerProvider/snapshotEnvelope';

/** Нормализует поле sprint/sprints в массив объектов (или пусто). */
function normalizeSprintFieldToArray(value: unknown): unknown[] {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return [value];
  if (typeof value === 'string') return [{ display: value, id: value, key: value }];
  return [];
}

/**
 * Проверяет, что значение поля sprint (массив или один объект) содержит наш спринт.
 */
export function sprintArrayContainsSprint(arr: unknown, sprintName: string, sprintId?: string): boolean {
  const normalized = normalizeSprintFieldToArray(arr);
  if (normalized.length === 0) return false;
  const name = sprintName.toLowerCase();
  const id = sprintId != null ? String(sprintId) : null;
  return normalized.some((item: unknown) => {
    if (!item || typeof item !== 'object') return false;
    const o = item as Record<string, unknown>;
    const display = (o.display as string) ?? (o.key as string) ?? '';
    const itemId = (o.id as string) ?? '';
    return (id && itemId === id) || display.toLowerCase() === name;
  });
}

/**
 * Актуальное членство в спринте по payload задачи (как в Tracker / issue_snapshots).
 */
export function issueDataSprintContains(
  issueDataRaw: unknown,
  sprintName: string,
  sprintId?: string
): boolean {
  const data = issueFieldsFromStoredSnapshot(issueDataRaw);
  if (!data) return false;
  const sprintField = data.sprint ?? data.sprints;
  return sprintArrayContainsSprint(sprintField, sprintName, sprintId);
}
