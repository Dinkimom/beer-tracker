import { fetchQuarterlyPlanContent } from '@/lib/quarterlyPlans/quarterlyPlansRepository';

import { parseSprintGoalPlanRow, planHasRow, type SprintGoalPlanRow } from './sprintGoalPlanRow';

/**
 * Привязка из тела запроса (QG5): `undefined` — поле не прислали, `null` — снять привязку, иначе строка
 * должна быть в сохранённом плане своего квартала. Ошибка — текст для ответа 400.
 */
export async function resolveSprintGoalPlanRow(
  organizationId: string,
  value: unknown
): Promise<{ error: string } | { planRow: SprintGoalPlanRow | null | undefined }> {
  if (value === undefined || value === null) return { planRow: value };
  const planRow = parseSprintGoalPlanRow(value);
  if (!planRow) return { error: 'planRow must be { year, quarter, rowId } or null' };
  const { content } = await fetchQuarterlyPlanContent(organizationId, planRow);
  if (!planHasRow(content, planRow.rowId)) {
    return { error: `planRow: no epic or direction ${planRow.rowId} in the plan of ${planRow.year} Q${planRow.quarter}` };
  }
  return { planRow };
}
