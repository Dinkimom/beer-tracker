import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { fetchQuarterlyPlanContent } from '@/lib/quarterlyPlans/quarterlyPlansRepository';

import {
  parseSprintGoalPlanRow,
  planHasRow,
  planRowQuarterTouchesSprint,
  type SprintGoalPlanRow,
} from './sprintGoalPlanRow';

/** Окно спринта из трекера организации; трекер недоступен — null (проверку квартала тогда пропускаем). */
async function loadSprintWindow(
  organizationId: string,
  sprintId: number
): Promise<{ endDate: string; startDate: string } | null> {
  try {
    const sprint = await (await getIssueTrackerProviderClientForOrganization(organizationId)).getSprint(sprintId);
    return sprint.startDate && sprint.endDate ? { endDate: sprint.endDate, startDate: sprint.startDate } : null;
  } catch (error) {
    console.warn(`[sprint-goals] getSprint(${sprintId}) for planRow check:`, error);
    return null;
  }
}

/**
 * Привязка из тела запроса (QG5): `undefined` — поле не прислали, `null` — снять привязку, иначе строка
 * должна быть в сохранённом плане своего квартала. Ошибка — текст для ответа 400.
 */
export async function resolveSprintGoalPlanRow(
  organizationId: string,
  value: unknown,
  /** Спринт цели: квартал привязки должен его задевать. null — спринт неизвестен, не проверяем. */
  sprintId: number | null
): Promise<{ error: string } | { planRow: SprintGoalPlanRow | null | undefined }> {
  if (value === undefined || value === null) return { planRow: value };
  const planRow = parseSprintGoalPlanRow(value);
  if (!planRow) return { error: 'planRow must be { year, quarter, rowId } or null' };
  const quarterLabel = `${planRow.year} Q${planRow.quarter}`;
  const { content } = await fetchQuarterlyPlanContent(organizationId, planRow);
  if (!planHasRow(content, planRow.rowId)) {
    return { error: `planRow: no epic or direction ${planRow.rowId} in the plan of ${quarterLabel}` };
  }
  const sprintWindow = sprintId != null ? await loadSprintWindow(organizationId, sprintId) : null;
  if (sprintWindow && !planRowQuarterTouchesSprint(planRow, sprintWindow)) {
    return { error: `planRow: ${quarterLabel} does not overlap sprint ${sprintId}` };
  }
  return { planRow };
}
