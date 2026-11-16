/**
 * API квартального плана: общий на организацию, все команды в одной сетке.
 */

import type { QuarterlyPlanDraftItem } from '@/lib/quarterlyPlans/quarterlyPlanDraftItems';
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

/** `refreshIssueKey` — задаче только что сменили статус: её строку сервер перечитает из трекера. */
export async function fetchQuarterlyPlan(
  { quarter, year }: QuarterRef,
  refreshIssueKey?: string
): Promise<QuarterlyPlanResponse> {
  const refresh = refreshIssueKey ? `&refresh=${encodeURIComponent(refreshIssueKey)}` : '';
  const { data } = await getPlannerBeerTrackerApi().get<QuarterlyPlanResponse>(
    `/quarterly-plans?year=${year}&quarter=${quarter}${refresh}`
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
  /** Пункты черновика — сущности плана, которые принимают и отклоняют по одному (QM10). */
  items: QuarterlyPlanDraftItem[];
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

/** Решение о черновике: весь (`itemIds` нет) или эти пункты (QM10). */
export interface QuarterlyPlanDraftDecision {
  itemIds?: readonly string[];
  proposalId: string;
}

/** Принять черновик или его пункты: план после принятия и его версия; ошибка — текстом (план не изменился). */
export async function approveQuarterlyPlanDraft(
  ref: QuarterRef,
  decision: QuarterlyPlanDraftDecision
): Promise<{ content: QuarterlyPlanContent; version: number } | { error: string }> {
  const response = await getPlannerBeerTrackerApi().post<{
    content?: QuarterlyPlanContent;
    error?: string;
    version?: number;
  }>('/quarterly-plans/draft', { ...ref, ...decision }, { validateStatus: (status) => status < 500 });
  const { content, error, version } = response.data;
  return response.status < 300 && content && version != null ? { content, version } : { error: error ?? 'error' };
}

export async function rejectQuarterlyPlanDraft(ref: QuarterRef, decision: QuarterlyPlanDraftDecision): Promise<void> {
  await getPlannerBeerTrackerApi().delete('/quarterly-plans/draft', { data: { ...ref, ...decision } });
}
