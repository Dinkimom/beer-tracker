'use client';

import type {
  QuarterlyPlan,
  QuarterlyPlanContent,
  QuarterRef,
} from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import {
  fetchBoardAvailabilityEventsForBoard,
  fetchQuarterlyPlan,
  saveQuarterlyPlan,
} from '@/lib/beerTrackerApi';
import { planIssueKeys } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

const AVAILABILITY_STALE_MS = 2 * 60 * 1000;

const quarterKey = ({ quarter, year }: QuarterRef) => `${year}-Q${quarter}`;

/**
 * План квартала и отсутствия команд. Отсутствия лежат в том же кэше, что у доски спринта
 * (`boardAvailabilityEvents`), поэтому правка на одном экране сразу видна на другом.
 *
 * Сохранение (QS5): каждая правка уходит целым планом с версией, которую клиент видел. Свои правки
 * идут по очереди и продвигают версию сами, поэтому друг с другом не конфликтуют. Чужое сохранение
 * между ними — 409: тост, план перечитывается, правки из очереди после конфликта не отправляются.
 */
export function useQuarterlyPlan(ref: QuarterRef) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { quarter, year } = ref;
  const queryKey = useMemo(() => ['quarterlyPlan', year, quarter] as const, [quarter, year]);

  /** Версия плана на сервере по кварталу: из последнего чтения или своего сохранения. */
  const versionsRef = useRef(new Map<string, number>());
  /** Очередь своих сохранений. */
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  /** Растёт на конфликт и ошибку: правки, вставшие в очередь раньше, больше не отправляются. */
  const saveGenerationRef = useRef(0);

  const planQuery = useQuery({
    queryFn: async () => {
      const { plan: loaded, version } = await fetchQuarterlyPlan({ quarter, year });
      versionsRef.current.set(quarterKey(loaded), version);
      return loaded;
    },
    queryKey,
  });
  const plan = planQuery.data ?? null;

  const boardIds = useMemo(() => (plan?.teams ?? []).map((team) => team.boardId), [plan]);
  const eventsByBoard = useQueries({
    combine: (results) => {
      const map = new Map<number, BoardAvailabilityEvent[]>();
      results.forEach((result, index) => map.set(boardIds[index]!, result.data ?? []));
      return map;
    },
    queries: boardIds.map((boardId) => ({
      queryFn: () => fetchBoardAvailabilityEventsForBoard(boardId),
      queryKey: ['boardAvailabilityEvents', boardId],
      staleTime: AVAILABILITY_STALE_MS,
    })),
  });

  const applyEdit = useCallback(
    (edit: (content: QuarterlyPlanContent) => QuarterlyPlanContent) => {
      const current = queryClient.getQueryData<QuarterlyPlan>(queryKey);
      if (!current) return;
      const content = edit(current);
      const { assignments, directions, epics, links, notes } = content;
      queryClient.setQueryData<QuarterlyPlan>(queryKey, { ...current, assignments, directions, epics, links, notes });

      const ref = { quarter, year };
      const generation = saveGenerationRef.current;
      const reload = (message: string) => {
        saveGenerationRef.current += 1;
        toast.error(t(message));
        queryClient.invalidateQueries({ queryKey }).catch(() => undefined);
      };
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        if (generation !== saveGenerationRef.current) return;
        try {
          const result = await saveQuarterlyPlan(
            ref,
            { assignments, directions, epics, links, notes },
            versionsRef.current.get(quarterKey(ref)) ?? 0
          );
          if ('conflict' in result) {
            reload('quarterlyPlan.saveConflict');
          } else {
            versionsRef.current.set(quarterKey(ref), result.version);
            // Новый ключ трекера: статус и название задачи сервер подтягивает при чтении плана.
            if (planIssueKeys(content).some((key) => !(key in current.trackerEpics))) {
              queryClient.invalidateQueries({ queryKey }).catch(() => undefined);
            }
          }
        } catch {
          reload('quarterlyPlan.saveError');
        }
      });
    },
    [quarter, queryClient, queryKey, t, year]
  );

  /** Версия плана после чужой записи, о которой клиент знает (принятый черновик агента). */
  const setVersion = useCallback(
    (version: number) => {
      versionsRef.current.set(quarterKey({ quarter, year }), version);
    },
    [quarter, year]
  );

  return { applyEdit, eventsByBoard, isLoading: planQuery.isLoading, plan, setVersion };
}
