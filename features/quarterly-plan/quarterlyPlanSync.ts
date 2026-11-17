/**
 * Совместная правка квартального плана (QS5): план сохраняется целиком поверх версии, которую видел
 * клиент, а правки нескольких людей сводятся по сущностям (`mergeQuarterlyPlanContent`).
 *
 * На квартал помним план с сервера (`base`) и его версию. Несохранённое — это разница между планом
 * на доске и `base`. Любой план с сервера (чтение, 409) проходит через `integrate`: чужое ложится на
 * доску, своё несохранённое остаётся и уходит следующим сохранением. Сохранения идут по одному.
 */

import type { QuarterlyPlan, QuarterlyPlanContent, QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { QueryClient } from '@tanstack/react-query';

import { isEqual } from 'lodash-es';

import { fetchQuarterlyPlan, saveQuarterlyPlan } from '@/lib/beerTrackerApi';
import { mergeQuarterlyPlanContent, quarterlyPlanContentOf } from '@/lib/quarterlyPlans/quarterlyPlanMerge';

/** Столько раз подряд план успели изменить между чтением и своей записью — дальше не настаиваем. */
const MAX_CONFLICTS_IN_ROW = 5;

export const quarterlyPlanQueryKey = ({ quarter, year }: QuarterRef) => ['quarterlyPlan', year, quarter] as const;

type SaveFailure = 'quarterlyPlan.saveConflict' | 'quarterlyPlan.saveError';

interface QuarterSyncState {
  /** План на сервере, каким клиент его видел последний раз; null — ещё не читали. */
  base: QuarterlyPlanContent | null;
  /** Идёт цикл сохранения. */
  saving: boolean;
  version: number;
}

interface QuarterlyPlanSyncCallbacks {
  /** Сохранить не вышло: несохранённое снято с доски, план перечитывается. */
  onFailed: (message: SaveFailure) => void;
  /** Запись легла: `before` — план до неё, `saved` — что записано. */
  onSaved: (before: QuarterlyPlanContent, saved: QuarterlyPlanContent) => void;
}

/** Состояние живёт рядом с кэшем запросов: переживает уход со страницы и возврат на неё. */
const statesByClient = new WeakMap<QueryClient, Map<string, QuarterSyncState>>();

function stateOf(queryClient: QueryClient, { quarter, year }: QuarterRef): QuarterSyncState {
  let states = statesByClient.get(queryClient);
  if (!states) {
    states = new Map();
    statesByClient.set(queryClient, states);
  }
  const key = `${year}-Q${quarter}`;
  let state = states.get(key);
  if (!state) {
    state = { base: null, saving: false, version: 0 };
    states.set(key, state);
  }
  return state;
}

/** Версия плана, с которой пойдёт следующая запись; из неё же идёт откат к версии (QH5). */
export function quarterlyPlanVersion(queryClient: QueryClient, ref: QuarterRef): number {
  return stateOf(queryClient, ref).version;
}

/**
 * План записал этот же клиент мимо доски (принятый черновик агента, откат): версия уже не ниже этой.
 * `content` — план после записи, если он известен и уже положен на доску: досылать его не нужно.
 */
export function noteQuarterlyPlanVersion(
  queryClient: QueryClient,
  ref: QuarterRef,
  version: number,
  content?: QuarterlyPlanContent
): void {
  const state = stateOf(queryClient, ref);
  if (version < state.version) return;
  state.version = version;
  if (content) state.base = quarterlyPlanContentOf(content);
}

function integrated(
  state: QuarterSyncState,
  current: QuarterlyPlan | undefined,
  loaded: QuarterlyPlan,
  version: number
): QuarterlyPlan {
  const remote = quarterlyPlanContentOf(loaded);
  if (!current || !state.base) {
    state.base = remote;
    state.version = version;
    return loaded;
  }
  const local = quarterlyPlanContentOf(current);
  if (version < state.version) return { ...loaded, ...local };
  const merged = isEqual(local, state.base) ? remote : mergeQuarterlyPlanContent(state.base, local, remote);
  state.base = remote;
  state.version = version;
  return { ...loaded, ...merged };
}

/**
 * План с сервера → на доску. Чужое принимаем, своё несохранённое оставляем. Ответ старше уже
 * известной версии (чтение началось до своей записи) содержимое не трогает: из него берём только то,
 * что сервер собирает из трекера и спринтов. Доску пишем здесь же: она и `base` меняются вместе,
 * даже если запрос, принёсший план, уже отменён.
 */
export function integrateQuarterlyPlan(
  queryClient: QueryClient,
  ref: QuarterRef,
  loaded: QuarterlyPlan,
  version: number
): QuarterlyPlan {
  const queryKey = quarterlyPlanQueryKey(ref);
  const plan = integrated(stateOf(queryClient, ref), queryClient.getQueryData<QuarterlyPlan>(queryKey), loaded, version);
  queryClient.setQueryData(queryKey, plan);
  return plan;
}

/** Несохранённое с доски → на сервер, пока доска и сервер не сойдутся. */
async function saveUntilSynced(
  queryClient: QueryClient,
  ref: QuarterRef,
  state: QuarterSyncState,
  callbacks: QuarterlyPlanSyncCallbacks
): Promise<void> {
  const queryKey = quarterlyPlanQueryKey(ref);
  let conflicts = 0;
  for (;;) {
    const current = queryClient.getQueryData<QuarterlyPlan>(queryKey);
    const before = state.base;
    if (!current || !before) return;
    const content = quarterlyPlanContentOf(current);
    if (isEqual(content, before)) return;
    const result = await saveQuarterlyPlan(ref, content, state.version);
    if ('conflict' in result) {
      conflicts += 1;
      if (conflicts > MAX_CONFLICTS_IN_ROW) throw new Error('quarterlyPlan.saveConflict');
      // План успели изменить: берём актуальный, своё ложится поверх и уходит следующим кругом.
      const { plan, version } = await fetchQuarterlyPlan(ref);
      integrateQuarterlyPlan(queryClient, ref, plan, version);
    } else {
      conflicts = 0;
      // Ответ мог прийти позже чтения, которое уже увидело более новую версию: назад не откатываемся.
      if (result.version > state.version) {
        state.base = content;
        state.version = result.version;
      }
      callbacks.onSaved(before, content);
    }
  }
}

/** Запускает сохранение несохранённого; уже идёт — оно само заберёт новые правки. */
export function flushQuarterlyPlan(queryClient: QueryClient, ref: QuarterRef, callbacks: QuarterlyPlanSyncCallbacks): void {
  const state = stateOf(queryClient, ref);
  if (state.saving) return;
  state.saving = true;
  saveUntilSynced(queryClient, ref, state, callbacks)
    .catch((error: unknown) => {
      const conflict = error instanceof Error && error.message === 'quarterlyPlan.saveConflict';
      // Несохранённое снимаем с доски, иначе оно уходило бы на сервер снова и снова.
      const { base } = state;
      if (base) {
        queryClient.setQueryData<QuarterlyPlan>(quarterlyPlanQueryKey(ref), (plan) => (plan ? { ...plan, ...base } : plan));
      }
      callbacks.onFailed(conflict ? 'quarterlyPlan.saveConflict' : 'quarterlyPlan.saveError');
    })
    .finally(() => {
      state.saving = false;
    });
}
