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

/** Свой черновик агента, применённый к текущему плану; null — черновика нет (QM9). */
export interface QuarterlyPlanDraftView {
  baseVersion: number;
  createdAt: string;
  /** Пакет больше не применяется к плану; черновик остаётся только отклонить. */
  error: string | null;
  /** План, каким он станет после черновика; null — не применился. */
  preview: { content: QuarterlyPlanContent } | null;
  proposalId: string;
  summary: string;
}

export async function fetchQuarterlyPlanDraft({ quarter, year }: QuarterRef): Promise<QuarterlyPlanDraftView | null> {
  const { data } = await getPlannerBeerTrackerApi().get<{ draft?: QuarterlyPlanDraftView | null }>(
    `/quarterly-plans/draft?year=${year}&quarter=${quarter}`
  );
  return data.draft ?? null;
}

/** Принять черновик целиком; ошибка — текстом (пакет не применился, план не изменился). */
export async function approveQuarterlyPlanDraft(ref: QuarterRef, proposalId: string): Promise<{ error: string } | { version: number }> {
  const response = await getPlannerBeerTrackerApi().post<{ error?: string; version?: number }>(
    '/quarterly-plans/draft',
    { ...ref, proposalId },
    { validateStatus: (status) => status < 500 }
  );
  return response.status < 300 && response.data.version != null
    ? { version: response.data.version }
    : { error: response.data.error ?? 'error' };
}

export async function rejectQuarterlyPlanDraft(ref: QuarterRef, proposalId: string): Promise<void> {
  await getPlannerBeerTrackerApi().delete('/quarterly-plans/draft', { data: { ...ref, proposalId } });
}
