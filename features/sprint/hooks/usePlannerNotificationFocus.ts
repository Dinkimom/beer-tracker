'use client';

import type { SprintPlannerUiStore } from '@/lib/layers/application/mobx/stores/sprintPlannerUiStore';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

import {
  PLANNER_NOTIFICATION_FOCUS_MS,
  tryScrollPlannerToTaskElement,
} from '@/features/sprint/hooks/plannerFocusTaskHelpers';
import {
  readPlannerFocusTaskFromSearchParams,
  stripPlannerFocusTaskFromHref,
} from '@/lib/planner/plannerUrl';
import { DELAYS } from '@/utils/constants';

interface UsePlannerNotificationFocusInput {
  isMounted: boolean;
  plannerDataReady: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  sprintPlannerUi: SprintPlannerUiStore;
  viewMode: 'compact' | 'features' | 'full' | 'kanban' | 'occupancy';
  setViewMode: (mode: 'compact' | 'features' | 'full' | 'kanban' | 'occupancy') => void;
}

function clearNotificationFocusTimer(
  timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
): void {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

export function usePlannerNotificationFocus({
  isMounted,
  plannerDataReady,
  scrollContainerRef,
  sprintPlannerUi,
  setViewMode,
  viewMode,
}: UsePlannerNotificationFocusInput): void {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const focusTaskId = readPlannerFocusTaskFromSearchParams(searchParams);
  const handledFocusTaskIdRef = useRef<string | null>(null);
  const clearFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stripFocusTaskFromUrl = useCallback(() => {
    const currentSearch = searchParams.toString();
    const currentHref = currentSearch ? `${pathname}?${currentSearch}` : pathname;
    const nextHref = stripPlannerFocusTaskFromHref(
      pathname,
      new URLSearchParams(currentSearch)
    );
    if (nextHref === currentHref) {
      return;
    }
    router.replace(nextHref, { scroll: false });
  }, [pathname, router, searchParams]);

  const scheduleClearNotificationFocus = useCallback(() => {
    clearNotificationFocusTimer(clearFocusTimerRef);
    clearFocusTimerRef.current = setTimeout(() => {
      sprintPlannerUi.clearNotificationFocusTaskId();
      clearFocusTimerRef.current = null;
    }, PLANNER_NOTIFICATION_FOCUS_MS);
  }, [sprintPlannerUi]);

  const handleFocusTaskFound = useCallback(
    (taskId: string) => {
      handledFocusTaskIdRef.current = taskId;
      sprintPlannerUi.setNotificationFocusTaskId(taskId);
      stripFocusTaskFromUrl();
      scheduleClearNotificationFocus();
    },
    [scheduleClearNotificationFocus, sprintPlannerUi, stripFocusTaskFromUrl]
  );

  const handleFocusTaskGiveUp = useCallback(
    (taskId: string) => {
      handledFocusTaskIdRef.current = taskId;
      stripFocusTaskFromUrl();
    },
    [stripFocusTaskFromUrl]
  );

  useEffect(() => {
    if (!focusTaskId) {
      handledFocusTaskIdRef.current = null;
    }
  }, [focusTaskId]);

  useEffect(() => {
    if (!focusTaskId) {
      return;
    }
    if (viewMode === 'kanban' || viewMode === 'occupancy') {
      setViewMode('full');
    }
  }, [focusTaskId, setViewMode, viewMode]);

  useEffect(() => {
    if (!isMounted || !plannerDataReady || !focusTaskId) {
      return;
    }
    if (handledFocusTaskIdRef.current === focusTaskId) {
      return;
    }
    if (viewMode !== 'full' && viewMode !== 'compact') {
      return;
    }

    const timeoutId = setTimeout(() => {
      tryScrollPlannerToTaskElement({
        container: scrollContainerRef.current,
        focusTaskId,
        onFound: () => handleFocusTaskFound(focusTaskId),
        onGiveUp: () => handleFocusTaskGiveUp(focusTaskId),
      });
    }, DELAYS.INITIAL_SCROLL);

    return () => clearTimeout(timeoutId);
  }, [
    focusTaskId,
    handleFocusTaskFound,
    handleFocusTaskGiveUp,
    isMounted,
    plannerDataReady,
    scrollContainerRef,
    viewMode,
  ]);

  useEffect(
    () => () => {
      clearNotificationFocusTimer(clearFocusTimerRef);
    },
    []
  );
}
