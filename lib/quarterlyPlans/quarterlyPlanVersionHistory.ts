/**
 * История версий квартального плана для доски и сервиса (QH1–QH4): запись версии при сохранении
 * и список версий со сводкой изменений. Чтение одной версии и откат — в `quarterlyPlanService`: им нужны люди плана.
 */

import type { QuarterlyPlanContent, QuarterRef } from './quarterlyPlanTypes';
import type { QuarterlyPlanVersionSource, QuarterlyPlanVersionSummary } from './quarterlyPlanVersions';

import { mergesIntoLatestVersion, summarizeQuarterlyPlanVersion } from './quarterlyPlanVersions';
import {
  ensureQuarterlyPlanBaselineVersion,
  fetchLatestQuarterlyPlanVersion,
  insertQuarterlyPlanVersion,
  listQuarterlyPlanVersions,
  updateQuarterlyPlanVersion,
} from './quarterlyPlanVersionsRepository';

/** Сколько последних версий показывает история. */
const HISTORY_LIMIT = 100;

/** Кто и как поменял план: от этого зависит, склеится ли правка с прошлой версией (QH2). */
export interface QuarterlyPlanVersionAuthor {
  id: string;
  source: Exclude<QuarterlyPlanVersionSource, 'baseline'>;
}

/** Перед первой записью истории: план, каким он был до неё, становится версией-основой (QH1). */
export async function prepareQuarterlyPlanVersion(organizationId: string, ref: QuarterRef): Promise<void> {
  try {
    await ensureQuarterlyPlanBaselineVersion(organizationId, ref);
  } catch (error) {
    console.warn('[quarterly-plan] baseline version:', error);
  }
}

/**
 * Сохранение легло в план — пишем версию или склеиваем с последней (QH2). История не должна ломать
 * сохранение: ошибка записи версии только логируется.
 */
export async function recordQuarterlyPlanVersion(input: {
  author: QuarterlyPlanVersionAuthor;
  content: QuarterlyPlanContent;
  organizationId: string;
  planVersion: number;
  ref: QuarterRef;
}): Promise<void> {
  const { author, content, organizationId, planVersion, ref } = input;
  try {
    const latest = await fetchLatestQuarterlyPlanVersion(organizationId, ref);
    if (latest && mergesIntoLatestVersion(latest, { authorId: author.id, at: new Date(), source: author.source })) {
      await updateQuarterlyPlanVersion({ content, id: latest.id, planVersion });
      return;
    }
    await insertQuarterlyPlanVersion({ authorId: author.id, content, organizationId, planVersion, ref, source: author.source });
  } catch (error) {
    console.warn('[quarterly-plan] record version:', error);
  }
}

/** Версия в списке истории: без содержимого, со сводкой того, что она поменяла (QH3). */
export interface QuarterlyPlanVersionListItem {
  authorName: string | null;
  createdAt: string;
  id: string;
  planVersion: number;
  source: QuarterlyPlanVersionSource;
  summary: QuarterlyPlanVersionSummary;
  updatedAt: string;
}

/** Версии плана, новые первыми, каждая — со сводкой относительно предыдущей; у самой старой сводки нет. */
export async function listQuarterlyPlanVersionHistory(
  organizationId: string,
  ref: QuarterRef
): Promise<QuarterlyPlanVersionListItem[]> {
  const versions = await listQuarterlyPlanVersions(organizationId, ref, HISTORY_LIMIT + 1);
  return versions.slice(0, HISTORY_LIMIT).map(({ content, ...version }, index) => {
    const previous = versions[index + 1];
    return { ...version, summary: previous ? summarizeQuarterlyPlanVersion(previous.content, content) : [] };
  });
}
