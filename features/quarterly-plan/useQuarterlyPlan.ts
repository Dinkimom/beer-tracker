'use client';

import type {
  QuarterlyPlan,
  QuarterlyPlanContent,
  QuarterRef,
} from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useDemoPlannerShell } from '@/contexts/DemoPlannerShellContext';
import { useI18n } from '@/contexts/LanguageContext';
import { SPRINT_GOAL_PLAN_ROWS_QUERY_KEY } from '@/features/sprint/hooks/useSprintGoalPlanRows';
import { useActiveOrganizationId } from '@/hooks/useActiveOrganizationId';
import { fetchBoardAvailabilityEventsForBoard, fetchQuarterlyPlan } from '@/lib/beerTrackerApi';
import { buildDemoQuarterPresenceViewers } from '@/lib/demo/demoPresenceViewers';
import { planIssueKeys } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { quarterlyPlanContentOf } from '@/lib/quarterlyPlans/quarterlyPlanMerge';
import { sprintPresenceViewersUiEqual } from '@/lib/realtime/sprintPresenceCollapse';
import { getBrowserRealtimeClientId } from '@/lib/realtime/sprintRealtimeClientId';
import { SPRINT_REALTIME_PATH } from '@/lib/realtime/sprintRealtimeConstants';
import { parseSprintRealtimeMessage } from '@/lib/realtime/sprintRealtimeProtocol';

import {
  flushQuarterlyPlan,
  integrateQuarterlyPlan,
  noteQuarterlyPlanVersion,
  quarterlyPlanQueryKey,
  quarterlyPlanVersion,
} from './quarterlyPlanSync';
import { QUARTERLY_PLAN_VERSIONS_QUERY_KEY } from './useQuarterlyPlanHistory';

const AVAILABILITY_STALE_MS = 2 * 60 * 1000;
const DEMO_PRESENCE_VIEWERS = buildDemoQuarterPresenceViewers();

/**
 * Канал квартала (SSE): `quarter.changed` — план изменил кто-то другой, доска его перечитывает (QS6);
 * `quarter.presence` — кто сейчас на доске и что делает (QS7), возвращается отсюда.
 * На `/demo/planner` канала нет: коллеги на доске — из фикстуры.
 */
function useQuarterlyPlanRealtime({ quarter, year }: QuarterRef, onChanged: () => void): SprintPresenceViewer[] {
  const { isDemoPlanner } = useDemoPlannerShell();
  const organizationId = useActiveOrganizationId();
  const onChangedRef = useRef(onChanged);
  const [viewers, setViewers] = useState<SprintPresenceViewer[]>([]);
  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  useEffect(() => {
    if (isDemoPlanner || !organizationId) return;
    const clientId = getBrowserRealtimeClientId();
    const params = new URLSearchParams({
      clientId,
      organizationId,
      quarter: String(quarter),
      year: String(year),
    });
    const source = new EventSource(`${SPRINT_REALTIME_PATH}/quarter?${params.toString()}`);
    source.onmessage = (message) => {
      const event = parseSprintRealtimeMessage(message.data);
      if (event?.type === 'quarter.changed') onChangedRef.current();
      if (event?.type === 'quarter.presence') {
        setViewers((current) => (sprintPresenceViewersUiEqual(current, event.viewers, clientId) ? current : event.viewers));
      }
    };
    return () => {
      source.close();
      setViewers([]);
    };
  }, [isDemoPlanner, organizationId, quarter, year]);
  return isDemoPlanner ? DEMO_PRESENCE_VIEWERS : viewers;
}

/**
 * План квартала и отсутствия команд. Отсутствия лежат в том же кэше, что у доски спринта
 * (`boardAvailabilityEvents`), поэтому правка на одном экране сразу видна на другом.
 *
 * Сохранение и совместная правка (QS5, QS6) — в `quarterlyPlanSync`: правка сразу ложится на доску и
 * уходит целым планом поверх версии, которую видел клиент. Чужие правки приходят по SSE и сливаются
 * со своими несохранёнными по сущностям, поэтому несколько человек правят план одновременно.
 */
export function useQuarterlyPlan(ref: QuarterRef) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { quarter, year } = ref;
  const queryKey = useMemo(() => quarterlyPlanQueryKey({ quarter, year }), [quarter, year]);

  const planQuery = useQuery({
    queryFn: async () => {
      const { plan: loaded, version } = await fetchQuarterlyPlan({ quarter, year });
      return integrateQuarterlyPlan(queryClient, { quarter, year }, loaded, version);
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

  const invalidate = useCallback(
    (key: readonly unknown[]) => {
      queryClient.invalidateQueries({ queryKey: key }).catch(() => undefined);
    },
    [queryClient]
  );

  /** Несохранённое с доски уходит на сервер; вызывается после каждой правки и после чтения плана. */
  const flush = useCallback(() => {
    flushQuarterlyPlan(
      queryClient,
      { quarter, year },
      {
        onFailed: (message) => {
          toast.error(t(message));
          invalidate(queryKey);
        },
        onSaved: (before, saved) => {
          // Правка легла в историю версий (QH1): открытый сайдбар перечитывает список.
          invalidate([QUARTERLY_PLAN_VERSIONS_QUERY_KEY, year, quarter]);
          // Строки плана у целей спринта (QG5): удалённая строка должна сразу стать висячей привязкой.
          invalidate(SPRINT_GOAL_PLAN_ROWS_QUERY_KEY);
          // Новый ключ трекера: статус и название задачи сервер подтягивает при чтении плана.
          const known = new Set(planIssueKeys(before));
          if (planIssueKeys(saved).some((key) => !known.has(key))) invalidate(queryKey);
        },
      }
    );
  }, [invalidate, quarter, queryClient, queryKey, t, year]);

  // Прочитанный план мог принести чужие правки поверх своих несохранённых: слитое досылаем.
  useEffect(() => {
    if (plan) flush();
  }, [flush, plan]);

  const presenceViewers = useQuarterlyPlanRealtime(
    ref,
    useCallback(() => {
      invalidate(queryKey);
      invalidate([QUARTERLY_PLAN_VERSIONS_QUERY_KEY, year, quarter]);
    }, [invalidate, quarter, queryKey, year])
  );

  const applyEdit = useCallback(
    (edit: (content: QuarterlyPlanContent) => QuarterlyPlanContent) => {
      const current = queryClient.getQueryData<QuarterlyPlan>(queryKey);
      if (!current) return;
      queryClient.setQueryData<QuarterlyPlan>(queryKey, { ...current, ...quarterlyPlanContentOf(edit(current)) });
      flush();
    },
    [flush, queryClient, queryKey]
  );

  /**
   * План записан мимо доски (принятый черновик агента, откат к версии): версия и, если известно,
   * содержимое — сразу на доску и в базу склейки. Иначе правка до перечитывания ушла бы со старым
   * содержимым и подходящей версией и молча затёрла бы записанное.
   */
  const setVersion = useCallback(
    (version: number, content?: QuarterlyPlanContent) => {
      noteQuarterlyPlanVersion(queryClient, { quarter, year }, version, content);
      if (!content) return;
      const { assignments, directions, epics, links, notes } = content;
      queryClient.setQueryData<QuarterlyPlan>(queryKey, (plan) =>
        plan ? { ...plan, assignments, directions, epics, links, notes } : plan
      );
    },
    [quarter, queryClient, queryKey, year]
  );

  /** Перечитываем только то, что план берёт из трекера и спринтов, — свои правки не трогаем. */
  const refreshServerFields = useCallback(
    async (field: 'sprintCards' | 'trackerEpics', issueKey?: string) => {
      const { plan: loaded } = await fetchQuarterlyPlan({ quarter, year }, issueKey);
      queryClient.setQueryData<QuarterlyPlan>(queryKey, (current) => (current ? { ...current, [field]: loaded[field] } : loaded));
    },
    [quarter, queryClient, queryKey, year]
  );
  const refreshTrackerRow = useCallback((issueKey: string) => refreshServerFields('trackerEpics', issueKey), [refreshServerFields]);
  /** Карточки спринтов сдвинули с доски квартала (QK9): перечитываем, где задачи стоят теперь. */
  const refreshSprintCards = useCallback(() => refreshServerFields('sprintCards'), [refreshServerFields]);

  /** Версия плана, с которой пойдёт следующая запись: из неё же идёт откат к версии (QH5). */
  const getVersion = useCallback(() => quarterlyPlanVersion(queryClient, { quarter, year }), [quarter, queryClient, year]);

  return {
    applyEdit,
    eventsByBoard,
    getVersion,
    isLoading: planQuery.isLoading,
    plan,
    presenceViewers,
    refreshSprintCards,
    refreshTrackerRow,
    setVersion,
  };
}
