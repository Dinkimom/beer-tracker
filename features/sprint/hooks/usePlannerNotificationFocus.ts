'use client';

import type { SprintPlannerUiStore } from '@/lib/layers/application/mobx/stores/sprintPlannerUiStore';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

import {
  PLANNER_NOTIFICATION_FOCUS_MS,
  tryScrollPlannerToTaskElement,
} from '@/features/sprint/hooks/plannerFocusTaskHelpers';
import { readPlannerFocusTaskFromSearchParams, setPlannerFocusTaskQuery } from '@/lib/planner/plannerUrl';
import { DELAYS } from '@/utils/constants';
import { replaceUrlQuery } from '@/utils/replaceUrlQuery';

interface UsePlannerNotificationFocusInput {
  isMounted: boolean;
  plannerDataReady: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  sprintPlannerUi: SprintPlannerUiStore;
  viewMode: 'compact' | 'features' | 'full' | 'kanban';
  setViewMode: (mode: 'compact' | 'features' | 'full' | 'kanban') => void;
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
  const focusTaskId = readPlannerFocusTaskFromSearchParams(searchParams);
  const handledFocusTaskIdRef = useRef<string | null>(null);
  const clearFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Снимаем из текущего адреса: колбэк зовётся из таймера прокрутки, query в замыкании может устареть.
  const stripFocusTaskFromUrl = useCallback(() => {
    replaceUrlQuery((params) => setPlannerFocusTaskQuery(params, null));
  }, []);

  const scheduleClearNotificationFocus = useCallback(() => {
    clearNotificationFocusTimer(clearFocusTimerRef);
    clearFocusTimerRef.current = setTimeout(() => {
      sprintPlannerUi.focus.clearNotificationFocusTaskId();
      clearFocusTimerRef.current = null;
    }, PLANNER_NOTIFICATION_FOCUS_MS);
  }, [sprintPlannerUi]);

  const handleFocusTaskFound = useCallback(
    (taskId: string) => {
      handledFocusTaskIdRef.current = taskId;
      sprintPlannerUi.focus.setNotificationFocusTaskId(taskId);
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
    if (viewMode === 'kanban') {
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
