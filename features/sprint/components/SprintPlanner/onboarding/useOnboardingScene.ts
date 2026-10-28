'use client';

import type { RectBox } from './plannerOnboardingGeometry';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { resolveOnboardingDayColumn } from './plannerOnboardingGeometry';

const DAY_SELECTOR = '[data-onboarding-day]';

interface OnboardingScene {
  column: RectBox | null;
  dayIndex: number | null;
}

/** Пересчёт геометрии онбординга: resize наблюдаемого узла, скролл контейнера и окна, первый кадр. */
export function subscribeOnboardingLayoutChanges(
  onChange: () => void,
  observed: Element | null,
  scrollContainer: HTMLElement | null
): () => void {
  const observer = new ResizeObserver(onChange);
  if (observed) {
    observer.observe(observed);
  }
  scrollContainer?.addEventListener('scroll', onChange, { passive: true });
  window.addEventListener('resize', onChange);
  window.addEventListener('scroll', onChange, true);
  const frame = requestAnimationFrame(onChange);
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    scrollContainer?.removeEventListener('scroll', onChange);
    window.removeEventListener('resize', onChange);
    window.removeEventListener('scroll', onChange, true);
  };
}

function readBox(element: Element): RectBox {
  const rect = element.getBoundingClientRect();
  return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
}

function readSceneSnapshot(active: boolean, scrollContainer: HTMLElement | null): string | null {
  if (!active || typeof document === 'undefined') {
    return null;
  }
  const days = [...document.querySelectorAll(DAY_SELECTOR)].flatMap((element) => {
    const index = Number(element.getAttribute('data-onboarding-day'));
    if (!Number.isInteger(index)) {
      return [];
    }
    return [{ index, rect: readBox(element) }];
  });
  const todayElement = document.querySelector('[data-onboarding-today="true"]');
  const todayRaw = Number(todayElement?.getAttribute('data-onboarding-day'));
  const todayIndex = Number.isInteger(todayRaw) ? todayRaw : null;
  const boardBottom = scrollContainer?.getBoundingClientRect().bottom ?? window.innerHeight;
  const column = resolveOnboardingDayColumn({ boardBottom, days, todayIndex });
  return JSON.stringify({
    column: column?.column ?? null,
    dayIndex: column?.dayIndex ?? null,
  });
}

function parseSceneSnapshot(snapshot: string | null): OnboardingScene | null {
  if (snapshot == null) {
    return null;
  }
  return JSON.parse(snapshot) as OnboardingScene;
}

export function useOnboardingScene(input: {
  active: boolean;
  scroll: boolean;
  scrollContainerRef: { readonly current: HTMLElement | null };
}): OnboardingScene | null {
  const { active, scroll, scrollContainerRef } = input;
  const subscribe = useCallback(
    (onChange: () => void) =>
      subscribeOnboardingLayoutChanges(onChange, scrollContainerRef.current, scrollContainerRef.current),
    [scrollContainerRef]
  );
  const getSnapshot = useCallback(
    () => readSceneSnapshot(active, scrollContainerRef.current),
    [active, scrollContainerRef]
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const parsed = useMemo(() => parseSceneSnapshot(snapshot), [snapshot]);
  const dayIndex = parsed?.dayIndex ?? null;

  useEffect(() => {
    if (!scroll || dayIndex == null) {
      return;
    }
    document
      .querySelector(`[data-onboarding-day="${dayIndex}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [dayIndex, scroll]);

  return parsed;
}
