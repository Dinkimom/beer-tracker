/**
 * API квартального плана: общий на организацию, все команды в одной сетке.
 */

import type { QuarterlyPlanDraftItem } from '@/lib/quarterlyPlans/quarterlyPlanDraftItems';
import type {
  QuarterlyPlan,
  QuarterlyPlanContent,
  QuarterRef,
} from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { QuarterlyPlanVersionListItem } from '@/lib/quarterlyPlans/quarterlyPlanVersionHistory';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

/** 409 при записи плана — ожидаемый ответ «план уже изменили», а не ошибка (QS5). */
const CONFLICT_IS_ANSWER = { validateStatus: (status: number) => (status >= 200 && status < 300) || status === 409 };

/** Новая версия плана — или `conflict`; статус проверяем сами: демо-адаптер `validateStatus` не применяет. */
function versionOrConflict(response: { data: { version: number }; status: number }): { conflict: true } | { version: number } {
  return response.status === 409 ? { conflict: true } : { version: response.data.version };
}

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
  return versionOrConflict(
    await getPlannerBeerTrackerApi().put<{ version: number }>('/quarterly-plans', { ...ref, content, ifVersion }, CONFLICT_IS_ANSWER)
  );
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


/** История версий плана, новые первыми. */
export async function fetchQuarterlyPlanVersions({ quarter, year }: QuarterRef): Promise<QuarterlyPlanVersionListItem[]> {
  const { data } = await getPlannerBeerTrackerApi().get<{ versions: QuarterlyPlanVersionListItem[] }>(
    `/quarterly-plans/versions?year=${year}&quarter=${quarter}`
  );
  return data.versions;
}

/** Содержимое версии и той, что перед ней (null — версия первая): по ним доска показывает её изменения (QH4). */
export async function fetchQuarterlyPlanVersion(
  { quarter, year }: QuarterRef,
  versionId: string
): Promise<{ content: QuarterlyPlanContent; previousContent: QuarterlyPlanContent | null }> {
  const { data } = await getPlannerBeerTrackerApi().get<{
    content: QuarterlyPlanContent;
    previousContent: QuarterlyPlanContent | null;
  }>(`/quarterly-plans/versions/${encodeURIComponent(versionId)}?year=${year}&quarter=${quarter}`);
  return data;
}

/** Откат плана к версии поверх `ifVersion` (QH5): новая версия плана — или `conflict`, план уже кто-то изменил. */
export async function restoreQuarterlyPlanVersion(
  ref: QuarterRef,
  versionId: string,
  ifVersion: number
): Promise<{ conflict: true } | { version: number }> {
  return versionOrConflict(
    await getPlannerBeerTrackerApi().post<{ version: number }>(
      `/quarterly-plans/versions/${encodeURIComponent(versionId)}`,
      { ...ref, ifVersion },
      CONFLICT_IS_ANSWER
    )
  );
}
