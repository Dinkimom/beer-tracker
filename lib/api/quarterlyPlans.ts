/**
 * API квартального плана: общий на организацию, все команды в одной сетке.
 */

import type {
  QuarterlyPlan,
  QuarterlyPlanContent,
  QuarterRef,
} from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

/** План и номер его сохранения: с ним идёт следующая запись (QS5). */
interface QuarterlyPlanResponse {
  plan: QuarterlyPlan;
  version: number;
}

export async function fetchQuarterlyPlan({ quarter, year }: QuarterRef): Promise<QuarterlyPlanResponse> {
  const { data } = await getPlannerBeerTrackerApi().get<QuarterlyPlanResponse>(
    `/quarterly-plans?year=${year}&quarter=${quarter}`
  );
  return data;
}

/**
 * Сохраняет план целиком поверх версии `ifVersion`. Новая версия — или `conflict`:
 * план уже сохранил кто-то другой, правка не записана.
 */
export async function saveQuarterlyPlan(
  ref: QuarterRef,
  content: QuarterlyPlanContent,
  ifVersion: number
): Promise<{ conflict: true } | { version: number }> {
  // 409 — ожидаемый ответ, а не ошибка; статус проверяем сами: демо-адаптер `validateStatus` не применяет.
  const response = await getPlannerBeerTrackerApi().put<{ version: number }>(
    '/quarterly-plans',
    { ...ref, content, ifVersion },
    { validateStatus: (status) => (status >= 200 && status < 300) || status === 409 }
  );
  return response.status === 409 ? { conflict: true } : { version: response.data.version };
}
